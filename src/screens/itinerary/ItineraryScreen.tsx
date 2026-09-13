import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { itineraryAPI, ItineraryItem } from '../../services/api';
import { TimelineItem } from '../../components/TimelineItem';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonCard } from '../../components/SkeletonCard';
import { colors } from '../../theme/colors';

const typeConfig: Record<string, { icon: string; color: string }> = {
  ride:  { icon: 'car-side',          color: colors.rides },
  stay:  { icon: 'bed',               color: colors.stays },
  event: { icon: 'champagne-glasses', color: colors.goldEnd },
  table: { icon: 'crown',             color: colors.goldEnd },
  queue: { icon: 'hourglass-half',    color: '#2ECC71' },
};

// TimelineItem expects a narrow display status, not the raw backend one —
// CONFIRMED/CHECKED_IN/ACTIVE all read as "confirmed" here, anything still
// pending payment reads as "upcoming".
const toDisplayStatus = (status: string): 'confirmed' | 'upcoming' | 'active' | 'completed' => {
  if (status === 'CHECKED_IN' || status === 'ACTIVE') return 'active';
  if (status === 'CONFIRMED') return 'confirmed';
  if (status === 'COMPLETED') return 'completed';
  return 'upcoming'; // INITIATED, PENDING_PAYMENT, PENDING_GROUP_PAYMENT, WAITING, CALLED
};

const dayLabel = (date: Date) => {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
};

export const ItineraryScreen = ({ navigation }: any) => {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await itineraryAPI.getMyItinerary();
      setItems(res.items);
      setHasError(false);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Live queue position + newly-confirmed bookings can change this at any
    // time, so keep it fresh without the person needing to pull-to-refresh.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const liveItems = items.filter((i) => !i.timestamp);
  const timedItems = items.filter((i) => i.timestamp);

  const groupedByDay = useMemo(() => {
    const groups: { label: string; date: Date; items: ItineraryItem[] }[] = [];
    for (const item of timedItems) {
      const date = new Date(item.timestamp!);
      const label = dayLabel(date);
      let group = groups.find((g) => g.label === label);
      if (!group) {
        group = { label, date, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }, [timedItems]);

  const headerSubtitle = items.length === 0
    ? null
    : items.length === 1
    ? '1 thing planned'
    : `${items.length} things planned${groupedByDay.length > 1 ? ` across ${groupedByDay.length} days` : ''}`;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <Icon name="route" size={18} color={colors.goldEnd} />
            <Text style={styles.title}>Itinerary</Text>
          </View>
          <View style={{ paddingHorizontal: 24, gap: 12 }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} height={80} />)}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <ErrorState title="Couldn't load your itinerary" subtitle="Something went wrong. Tap to retry." onRetry={load} />
        </SafeAreaView>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <Icon name="route" size={18} color={colors.goldEnd} />
            <Text style={styles.title}>Itinerary</Text>
          </View>
          <EmptyState
            icon="route"
            title="Nothing planned yet"
            subtitle="Book a ride, a stay, an event, or a table and it'll show up here automatically — with everything laid out by time, so you always know what's next."
            ctaLabel="Start Exploring"
            onCta={() => navigation.navigate('ExploreTab')}
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
          <View style={styles.headerLeft}>
            <Icon name="route" size={18} color={colors.goldEnd} />
            <View>
              <Text style={styles.title}>Itinerary</Text>
              {headerSubtitle && <Text style={styles.subtitle}>{headerSubtitle}</Text>}
            </View>
          </View>
          {liveItems.length > 0 && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Live items — queue position, no fixed time, most time-sensitive */}
          {liveItems.map((item) => {
            const config = typeConfig[item.type];
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.liveCard}
                onPress={() => navigation.navigate('QueueStatus', {
                  queueId: item.bookingId,
                  venueName: item.title.replace(/^In Queue: /, ''),
                })}
              >
                <View style={[styles.liveIconWrap, { backgroundColor: `${config.color}18` }]}>
                  <Icon name={config.icon} size={16} color={config.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.liveTitle}>{item.title}</Text>
                  <Text style={styles.liveSubtitle}>{item.subtitle}</Text>
                </View>
                <Icon name="chevron-right" size={12} color={colors.textMuted} />
              </TouchableOpacity>
            );
          })}

          {/* Timed items grouped by day */}
          {groupedByDay.map((group) => (
            <View key={group.label} style={styles.dayGroup}>
              <Text style={styles.dayLabel}>{group.label}</Text>
              {group.items.map((item, index) => {
                const config = typeConfig[item.type];
                const time = new Date(item.timestamp!).toLocaleTimeString('en-GB', {
                  hour: '2-digit', minute: '2-digit',
                });
                return (
                  <TimelineItem
                    key={item.id}
                    time={time}
                    title={item.title}
                    meta={item.subtitle ?? ''}
                    icon={config.icon}
                    iconColor={config.color}
                    status={toDisplayStatus(item.status)}
                    isLast={index === group.items.length - 1}
                  />
                );
              })}
            </View>
          ))}

          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ExploreTab')}>
            <Icon name="plus" size={14} color={colors.goldEnd} />
            <Text style={styles.addBtnText}>Plan Something Else</Text>
          </TouchableOpacity>

          <Text style={styles.footNote}>
            This updates automatically as you book — nothing to add by hand.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16, gap: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 24, color: colors.textPrimary },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(46,204,113,0.12)',
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.3)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success },
  liveText: { fontFamily: 'Inter-Bold', fontSize: 10, color: colors.success, letterSpacing: 0.8 },
  scroll: { paddingHorizontal: 24, paddingBottom: 32 },
  liveCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.25)',
    borderRadius: 14, padding: 14, marginBottom: 12,
  },
  liveIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  liveTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.textPrimary },
  liveSubtitle: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted, marginTop: 2 },
  dayGroup: { marginBottom: 20 },
  dayLabel: {
    fontFamily: 'Inter-Bold', fontSize: 12, color: colors.goldEnd,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.goldMid, borderStyle: 'dashed',
    borderRadius: 28, paddingVertical: 14, marginTop: 8,
  },
  addBtnText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.goldEnd },
  footNote: {
    fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted,
    textAlign: 'center', marginTop: 16, lineHeight: 16,
  },
});
