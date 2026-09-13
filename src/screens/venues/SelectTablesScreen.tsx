import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { tableListingsAPI, TableListing } from '../../services/api';
import { GoldButton } from '../../components/GoldButton';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

const zoneConfig = [
  { label: 'BOOTH SECTION', match: (c: string) => c === 'booth' },
  { label: 'LOUNGE TABLES', match: (c: string) => c === 'standard' },
  { label: 'PRIVATE SECTION', match: (c: string) => c === 'private' || c === 'vip' || c === 'vvip' },
];

export const SelectVenueTableScreen = ({ route, navigation }: any) => {
  const { venueId, venueName, bookingDate } = route.params;
  const [selectedTable, setSelectedTable] = useState<TableListing | null>(null);
  const [tables, setTables] = useState<TableListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await tableListingsAPI.getVenueTables(venueId);
      setTables(res.tables ?? []);
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => { load(); }, [load]);

  const getTableStyle = (table: TableListing) => {
    if (!table.available) return styles.tableBooked;
    if (selectedTable?.id === table.id) return styles.tableSelected;
    return styles.tableAvailable;
  };

  const tableLabel = (table: TableListing, index: number) => {
    const digits = table.name.match(/\d+/);
    return digits ? digits[0] : String(index + 1);
  };

  const formattedDateTime = bookingDate
    ? new Date(bookingDate).toLocaleString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : '';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ padding: 24, gap: 12 }}>
          <SkeletonCard height={48} />
          <SkeletonCard height={300} />
          <SkeletonCard height={80} />
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Select a Table</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Context Banner */}
        <View style={styles.contextBanner}>
          <Icon name="building" size={14} color={colors.goldEnd} />
          <Text style={styles.contextText} numberOfLines={1}>
            {venueName} · {formattedDateTime}
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.legendTitle}>Floor Layout</Text>
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
            <View style={styles.bar}>
              <Icon name="martini-glass" size={12} color={colors.textMuted} />
              <Text style={styles.barLabel}>BAR</Text>
            </View>

            {zoneConfig.map(({ label, match }) => {
              const zoneTables = tables.filter((t) => match(t.category));
              if (zoneTables.length === 0) return null;
              return (
                <View key={label} style={styles.zoneSection}>
                  <Text style={styles.zoneLabel}>{label}</Text>
                  <View style={styles.tableRow}>
                    {zoneTables.map((table, i) => (
                      <TouchableOpacity
                        key={table.id}
                        style={[styles.tableCircle, getTableStyle(table)]}
                        onPress={() => table.available && setSelectedTable(table)}
                        disabled={!table.available}
                      >
                        {(table.category === 'private' || table.category === 'vip' || table.category === 'vvip') && (
                          <Icon name="crown" size={7} color={selectedTable?.id === table.id ? '#0A0A0F' : colors.goldMid} />
                        )}
                        <Text style={[styles.tableNum, {
                          color: !table.available
                            ? 'rgba(248,113,113,0.4)'
                            : selectedTable?.id === table.id
                            ? '#0A0A0F'
                            : '#2ECC71',
                        }]}>
                          {tableLabel(table, i)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}

            {tables.length === 0 && (
              <Text style={styles.noTablesText}>No tables available at this venue right now.</Text>
            )}
          </View>

          {/* Summary */}
          {selectedTable && (
            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryName}>{selectedTable.name}</Text>
                <Text style={styles.summaryMeta}>
                  {selectedTable.category} · Up to {selectedTable.capacity} guests
                </Text>
                <Text style={styles.partyNote}>
                  Seats up to {selectedTable.capacity} guests
                </Text>
              </View>
              <Text style={styles.summaryPrice}>
                ₦{formatNaira(selectedTable.price)}
                {'\n'}
                <Text style={styles.minSpendLabel}>min spend</Text>
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
                onPress={() => navigation.navigate('Payment', {
                  venueId,
                  tableId: selectedTable.id,
                  tableName: selectedTable.name,
                  tablePrice: selectedTable.price,
                  bookingDate,
                  tableCapacity: selectedTable?.capacity,
                  quantity: 0,
                  totalPrice: 0,
                })}
                style={{ marginBottom: 10 }}
              />
              <GoldButton
                title="Split the Bill with Friends"
                onPress={() => navigation.navigate('GroupBooking', {
                  venueId,
                  tableId: selectedTable.id,
                  tableName: selectedTable.name,
                  tablePrice: selectedTable.price,
                  maxGuests: selectedTable.capacity,
                })}
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
  scroll: { paddingHorizontal: 24 },
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
    borderRadius: 18, padding: 18, marginBottom: 16, gap: 16,
  },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10, paddingVertical: 10,
  },
  barLabel: { fontFamily: 'Inter-Bold', fontSize: 11, color: colors.textMuted, letterSpacing: 1 },
  zoneSection: { gap: 8 },
  zoneLabel: {
    fontFamily: 'Inter-Medium', fontSize: 10,
    color: colors.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.8, textAlign: 'center',
  },
  tableRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  tableCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  tableAvailable: { backgroundColor: 'rgba(46,204,113,0.1)', borderColor: '#2ECC71' },
  tableSelected: { backgroundColor: colors.goldEnd, borderColor: colors.goldEnd, ...shadows.goldGlow },
  tableBooked: { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.3)' },
  tableNum: { fontFamily: 'Inter-Bold', fontSize: 11 },
  noTablesText: {
    fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted,
    textAlign: 'center', paddingVertical: 20,
  },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderTopWidth: 2,
    borderColor: colors.borderGold, borderTopColor: colors.goldEnd,
    borderRadius: 16, padding: 16,
  },
  summaryName: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.textPrimary },
  summaryMeta: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted },
  partyNote: { fontFamily: 'Inter-Regular', fontSize: 10, color: colors.goldMid, marginTop: 4 },
  summaryPrice: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 17, color: colors.goldEnd, textAlign: 'right' },
  minSpendLabel: { fontFamily: 'Inter-Regular', fontSize: 10, color: colors.textMuted },
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 18, paddingBottom: 32,
    backgroundColor: 'rgba(10,10,15,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(201,151,42,0.12)',
  },
});
