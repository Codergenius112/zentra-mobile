/**
 * Route: TableList
 * Params: { venueId, venueName }
 * GET /tables/venue/:venueId
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StarlightBackground from '../../components/StarlightBackground';
import { tableListingsAPI } from '../../services/api';
import type { TableListing } from '../../services/api';

const CATEGORY_ORDER = ['standard', 'vip', 'vvip', 'booth', 'private'];

const CATEGORY_META: Record<string, { label: string; color: string; icon: any }> = {
  standard: { label: 'Standard', color: '#888',    icon: 'restaurant-outline'  },
  vip:      { label: 'VIP',      color: '#f5dd4b', icon: 'star-outline'        },
  vvip:     { label: 'VVIP',     color: '#ff6b35', icon: 'diamond-outline'     },
  booth:    { label: 'Booth',    color: '#00bcd4', icon: 'cube-outline'         },
  private:  { label: 'Private',  color: '#e91e8c', icon: 'lock-closed-outline' },
};

type VenueTable = TableListing & { available: boolean };

export default function TableListScreen({ route, navigation }: any) {
  const { venueId, venueName } = route.params || {};

  const [tables, setTables]             = useState<VenueTable[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchTables = useCallback(async () => {
    if (!venueId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await tableListingsAPI.getVenueTables(venueId);
      setTables(res.tables || []);
    } catch (err: any) {
      console.error('Failed to fetch tables:', err);
      // Don't crash on 500 error, just show empty state
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => { fetchTables(); }, [fetchTables]);

  const presentCategories = CATEGORY_ORDER.filter(c => tables.some(t => t.category === c));
  const filtered = activeFilter === 'all' ? tables : tables.filter(t => t.category === activeFilter);
  const grouped = CATEGORY_ORDER.reduce<Record<string, VenueTable[]>>((acc, cat) => {
    const items = filtered.filter(t => t.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <View style={s.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Reserve a Table</Text>
          {venueName && <Text style={s.headerSub}>{venueName}</Text>}
        </View>
        <View style={s.iconBtn} />
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
        {['all', ...presentCategories].map(f => {
          const meta = CATEGORY_META[f];
          const isActive = activeFilter === f;
          return (
            <TouchableOpacity key={f} style={[s.tab, isActive && s.tabActive]}
              onPress={() => setActiveFilter(f)}>
              {meta && <Ionicons name={meta.icon} size={13} color={isActive ? '#000' : '#888'} />}
              <Text style={[s.tabText, isActive && s.tabTextActive]}>
                {f === 'all' ? 'All' : meta?.label || f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await fetchTables(); setRefreshing(false); }}
          tintColor="#f5dd4b" colors={['#f5dd4b']} />}>
        {loading ? (
          <View style={s.centered}><ActivityIndicator size="large" color="#f5dd4b" /></View>
        ) : tables.length === 0 ? (
          <View style={s.centered}>
            <Ionicons name="restaurant-outline" size={64} color="#333" />
            <Text style={s.emptyTitle}>No tables available</Text>
            <Text style={s.emptySub}>Check back closer to the event</Text>
          </View>
        ) : (
          <>
            {Object.entries(grouped).map(([cat, catTables]) => {
              const meta  = CATEGORY_META[cat];
              const color = meta?.color || '#888';
              return (
                <View key={cat}>
                  <View style={s.sectionHeader}>
                    <Ionicons name={meta?.icon || 'restaurant-outline'} size={15} color={color} />
                    <Text style={[s.sectionTitle, { color }]}>{meta?.label || cat} Tables</Text>
                    <Text style={s.sectionCount}>
                      {catTables.filter(t => t.available).length}/{catTables.length} available
                    </Text>
                  </View>

                  {catTables.map(table => (
                    <TouchableOpacity key={table.id}
                      style={[s.card, !table.available && s.cardUnavailable]}
                      onPress={() => table.available && navigation.navigate('TableBooking', {
                        tableId:     table.id,
                        tableName:   table.name,
                        category:    table.category,
                        capacity:    table.capacity,
                        price:       table.price,
                        venueId:     table.venueId,
                        venueName,
                        description: table.description,
                        features:    table.features,
                      })}
                      disabled={!table.available} activeOpacity={0.85}>

                      <LinearGradient
                        colors={cat === 'vvip'  ? ['#ff6b35','#d4581a']
                          : cat === 'vip'   ? ['#f5dd4b','#d4a017']
                          : cat === 'booth' ? ['#00bcd4','#0097a7']
                          : ['#1a1a1a','#2a2a2a']}
                        style={s.badge} start={{ x:0,y:0 }} end={{ x:1,y:1 }}>
                        <Ionicons name={meta?.icon || 'restaurant-outline'} size={20}
                          color={cat === 'standard' ? '#888' : '#000'} />
                      </LinearGradient>

                      <View style={s.cardInfo}>
                        <View style={s.cardTopRow}>
                          <Text style={s.cardName} numberOfLines={1}>{table.name}</Text>
                          <View style={[s.catChip, { backgroundColor: color + '20' }]}>
                            <Text style={[s.catChipText, { color }]}>{meta?.label || cat}</Text>
                          </View>
                        </View>
                        {!!table.description && (
                          <Text style={s.cardDesc} numberOfLines={1}>{table.description}</Text>
                        )}
                        <View style={s.cardMeta}>
                          <Ionicons name="people-outline" size={13} color="#888" />
                          <Text style={s.cardMetaText}>Up to {table.capacity}</Text>
                          {table.features?.slice(0,2).map((f,i) => (
                            <View key={i} style={s.featureChip}>
                              <Text style={s.featureText}>{f}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={s.cardFooter}>
                          <Text style={[s.price, cat === 'vvip' && { color: '#ff6b35' }]}>
                            ₦{Number(table.price).toLocaleString()}
                          </Text>
                          {table.available ? (
                            <View style={s.selectBtn}>
                              <Text style={s.selectBtnText}>Select</Text>
                              <Ionicons name="arrow-forward" size={13} color="#f5dd4b" />
                            </View>
                          ) : (
                            <View style={s.bookedChip}>
                              <Text style={s.bookedText}>Booked</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#000' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 54, paddingBottom: 12 },
  iconBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  headerCenter:  { alignItems: 'center' },
  headerTitle:   { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSub:     { fontSize: 12, color: '#888', marginTop: 2 },
  tabsScroll:    { maxHeight: 52 },
  tabsContent:   { paddingHorizontal: 20, gap: 8, alignItems: 'center', paddingVertical: 8 },
  tab:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: '#222' },
  tabActive:     { backgroundColor: '#f5dd4b', borderColor: '#f5dd4b' },
  tabText:       { color: '#888', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#000' },
  scroll:        { flex: 1 },
  centered:      { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle:    { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
  emptySub:      { color: '#666', fontSize: 14, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', flex: 1 },
  sectionCount:  { color: '#555', fontSize: 12 },
  card:          { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, marginHorizontal: 20, marginBottom: 12, padding: 14, borderWidth: 1, borderColor: '#1a1a1a', gap: 14 },
  cardUnavailable: { opacity: 0.4 },
  badge:         { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardInfo:      { flex: 1 },
  cardTopRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName:      { color: '#fff', fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  catChip:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catChipText:   { fontSize: 11, fontWeight: '700' },
  cardDesc:      { color: '#666', fontSize: 12, marginBottom: 8 },
  cardMeta:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  cardMetaText:  { color: '#888', fontSize: 12 },
  featureChip:   { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  featureText:   { color: '#666', fontSize: 11 },
  cardFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price:         { color: '#f5dd4b', fontSize: 17, fontWeight: 'bold' },
  selectBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(245,221,75,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  selectBtnText: { color: '#f5dd4b', fontSize: 12, fontWeight: '600' },
  bookedChip:    { backgroundColor: 'rgba(255,68,68,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  bookedText:    { color: '#ff4444', fontSize: 12, fontWeight: '600' },
});