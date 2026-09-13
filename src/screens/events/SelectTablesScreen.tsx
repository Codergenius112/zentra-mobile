import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { eventsAPI, tableListingsAPI, BackendEvent, TableListing } from '../../services/api';
import { GoldButton } from '../../components/GoldButton';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

const VIP_CATEGORIES = ['vip', 'vvip'];

export const SelectTableScreen = ({ route, navigation }: any) => {
  const { eventId, ticketQty, ticketTotal } = route.params;
  const [selectedTable, setSelectedTable] = useState<TableListing | null>(null);
  const [event, setEvent] = useState<BackendEvent | null>(null);
  const [tables, setTables] = useState<TableListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const eventData = await eventsAPI.getEventById(eventId);
      setEvent(eventData);

      // Recurring venue (club, lounge) → tables live on the venue and are
      // shared across every event held there. One-off space (stadium, field,
      // no venueId on the event) → tables are registered directly on the
      // event instead. See services/api.ts tableListingsAPI for both routes.
      const tableRes = eventData.venueId
        ? await tableListingsAPI.getVenueTables(eventData.venueId)
        : await tableListingsAPI.getEventTables(eventId);
      setTables(tableRes.tables ?? []);
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const vipTables = tables.filter((t) => VIP_CATEGORIES.includes(t.category));
  const standardTables = tables.filter((t) => !VIP_CATEGORIES.includes(t.category));

  const getTableStyle = (table: TableListing) => {
    if (!table.available) return styles.tableBooked;
    if (selectedTable?.id === table.id) return styles.tableSelected;
    return styles.tableAvailable;
  };

  const getTableTextStyle = (table: TableListing) => {
    if (!table.available) return styles.tableTextBooked;
    if (selectedTable?.id === table.id) return styles.tableTextSelected;
    return styles.tableTextAvailable;
  };

  // Short label for the floor-plan circle since tables don't have a separate "number" field
  const tableLabel = (table: TableListing, index: number) => {
    const digits = table.name.match(/\d+/);
    return digits ? digits[0] : String(index + 1);
  };

  const handleBookSolo = () => {
    if (!selectedTable) return;
    navigation.navigate('Payment', {
      eventId,
      venueId: event?.venueId ?? undefined,
      quantity: ticketQty ?? 0,
      totalPrice: ticketTotal ?? 0,
      tableId: selectedTable.id,
      tableName: selectedTable.name,
      tablePrice: selectedTable.price,
      eventLabel: event?.name,
    });
  };

  const handleSplitWithFriends = () => {
    if (!selectedTable) return;
    navigation.navigate('GroupBooking', {
      eventId,
      venueId: event?.venueId ?? null,
      tableId: selectedTable.id,
      tableName: selectedTable.name,
      tablePrice: selectedTable.price,
      maxGuests: selectedTable.capacity,
      ticketQty,
      ticketTotal,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView>
          <View style={{ padding: 24, gap: 12 }}>
            <SkeletonCard height={48} />
            <SkeletonCard height={280} />
            <SkeletonCard height={80} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <ErrorState
            title="Couldn't load tables"
            subtitle="Something went wrong. Tap to retry."
            onRetry={load}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Select a Table</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Context Banner */}
        {event && (
          <View style={styles.contextBanner}>
            <Icon name="champagne-glasses" size={14} color={colors.goldEnd} />
            <Text style={styles.contextText} numberOfLines={1}>
              {event.name} · {new Date(event.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Legend */}
          <Text style={styles.legendTitle}>Venue Floor Plan</Text>
          <View style={styles.legend}>
            {[
              { color: '#2ECC71', label: 'Available' },
              { color: colors.goldEnd, label: 'Selected' },
              { color: '#F87171', label: 'Booked' },
            ].map(({ color, label }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: color }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Floor Plan */}
          <View style={styles.floorPlan}>
            <View style={styles.stage}>
              <Icon name="music" size={12} color={colors.textMuted} />
              <Text style={styles.stageLabel}>STAGE / DJ</Text>
            </View>

            <View style={styles.tablesGrid}>
              {vipTables.length > 0 && (
                <>
                  <Text style={styles.zoneLabel}>VIP</Text>
                  <View style={styles.tableRow}>
                    {vipTables.map((table, i) => (
                      <TouchableOpacity
                        key={table.id}
                        style={[styles.tableCircle, getTableStyle(table)]}
                        onPress={() => table.available && setSelectedTable(table)}
                        disabled={!table.available}
                      >
                        {selectedTable?.id === table.id && (
                          <Icon name="crown" size={8} color="#0A0A0F" />
                        )}
                        <Text style={[styles.tableNum, getTableTextStyle(table)]}>
                          {tableLabel(table, i)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <View style={styles.danceFloor}>
                <Text style={styles.danceFloorLabel}>DANCE FLOOR</Text>
              </View>

              {standardTables.length > 0 && (
                <>
                  <Text style={styles.zoneLabel}>STANDARD</Text>
                  <View style={styles.tableRow}>
                    {standardTables.map((table, i) => (
                      <TouchableOpacity
                        key={table.id}
                        style={[styles.tableCircle, getTableStyle(table)]}
                        onPress={() => table.available && setSelectedTable(table)}
                        disabled={!table.available}
                      >
                        <Text style={[styles.tableNum, getTableTextStyle(table)]}>
                          {tableLabel(table, i)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {tables.length === 0 && (
                <Text style={styles.noTablesText}>No tables available at this venue right now.</Text>
              )}
            </View>
          </View>

          {/* Selected Table Summary */}
          {selectedTable && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryLeft}>
                <View style={styles.summaryIconWrap}>
                  <Icon name="crown" size={16} color={colors.goldEnd} />
                </View>
                <View>
                  <Text style={styles.summaryName}>{selectedTable.name}</Text>
                  <Text style={styles.summaryMeta}>
                    Up to {selectedTable.capacity} guests · {selectedTable.description || 'Bottle service'}
                  </Text>
                </View>
              </View>
              <Text style={styles.summaryPrice}>
                ₦{formatNaira(selectedTable.price)}
              </Text>
            </View>
          )}

          <View style={{ height: 90 }} />
        </ScrollView>

        <View style={styles.bottomCta}>
          {selectedTable ? (
            <>
              <GoldButton
                title={`Book ${selectedTable.name} →`}
                onPress={handleBookSolo}
                style={{ marginBottom: 10 }}
              />
              <GoldButton
                title="Split the Bill with Friends"
                onPress={handleSplitWithFriends}
                variant="secondary"
              />
            </>
          ) : (
            <GoldButton title="Select a Table" onPress={() => {}} disabled />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: colors.textPrimary },
  contextBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    marginHorizontal: 24, marginBottom: 16,
  },
  contextText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textSecondary, flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 16 },
  legendTitle: {
    fontFamily: 'Inter-Medium', fontSize: 11,
    color: colors.goldMid, textTransform: 'uppercase',
    letterSpacing: 0.6, marginBottom: 10,
  },
  legend: { flexDirection: 'row', gap: 18, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted },
  floorPlan: {
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 18, padding: 20, marginBottom: 16,
  },
  stage: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: 'rgba(120,80,220,0.14)',
    borderWidth: 1, borderColor: 'rgba(120,80,220,0.25)',
    borderRadius: 10, paddingVertical: 10, marginBottom: 20,
  },
  stageLabel: {
    fontFamily: 'Inter-Bold', fontSize: 11,
    color: 'rgba(180,140,255,0.8)', letterSpacing: 1,
  },
  tablesGrid: { gap: 12 },
  zoneLabel: {
    fontFamily: 'Inter-Medium', fontSize: 10,
    color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, textAlign: 'center',
  },
  tableRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
  tableCircle: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  tableAvailable: { backgroundColor: 'rgba(46,204,113,0.1)', borderColor: '#2ECC71' },
  tableSelected: {
    backgroundColor: colors.goldEnd, borderColor: colors.goldEnd,
    ...shadows.goldGlow,
    shadowOpacity: 0.7,
  },
  tableBooked: { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.3)' },
  tableNum: { fontFamily: 'Inter-Bold', fontSize: 11 },
  tableTextAvailable: { color: '#2ECC71' },
  tableTextSelected: { color: '#0A0A0F' },
  tableTextBooked: { color: 'rgba(248,113,113,0.4)' },
  danceFloor: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10, paddingVertical: 20, alignItems: 'center',
  },
  danceFloorLabel: {
    fontFamily: 'Inter-Medium', fontSize: 10,
    color: colors.textMuted, letterSpacing: 1.2,
  },
  noTablesText: {
    fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted,
    textAlign: 'center', paddingVertical: 20,
  },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderTopWidth: 2, borderColor: colors.borderGold,
    borderTopColor: colors.goldEnd,
    borderRadius: 16, padding: 16,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  summaryIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(201,151,42,0.12)',
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  summaryName: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.textPrimary },
  summaryMeta: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted },
  summaryPrice: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 17, color: colors.goldEnd },
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 18, paddingBottom: 32,
    backgroundColor: 'rgba(10,10,15,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(201,151,42,0.12)',
  },
});
