import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { bookingsAPI, eventsAPI, BackendBooking } from '../../services/api';
import { BadgePill } from '../../components/BadgePill';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { SkeletonCard } from '../../components/SkeletonCard';
import { colors } from '../../theme/colors';
import { formatNaira } from '../../utils/formatNaira';

const tabs = ['Upcoming', 'Completed', 'Cancelled'] as const;

const SETTLED_STATUSES = ['COMPLETED', 'CANCELLED', 'EXPIRED'];

const statusToBadge: Record<string, { label: string; variant: 'confirmed' | 'cancelled' | 'upcoming' }> = {
  CONFIRMED: { label: 'Confirmed', variant: 'confirmed' },
  CHECKED_IN: { label: 'Checked In', variant: 'confirmed' },
  ACTIVE: { label: 'Active', variant: 'confirmed' },
  COMPLETED: { label: 'Completed', variant: 'confirmed' },
  PENDING_GROUP_PAYMENT: { label: 'Awaiting Payment', variant: 'upcoming' },
  PENDING_PAYMENT: { label: 'Awaiting Payment', variant: 'upcoming' },
  INITIATED: { label: 'Pending', variant: 'upcoming' },
  CANCELLED: { label: 'Cancelled', variant: 'cancelled' },
  EXPIRED: { label: 'Expired', variant: 'cancelled' },
};

const bookingTypeIcon: Record<string, string> = {
  ticket: 'ticket',
  table: 'champagne-glasses',
  apartment: 'bed',
  car: 'car',
};

interface DisplayBooking extends BackendBooking {
  displayName: string;
}

export const MyBookingsScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Upcoming');
  const [bookings, setBookings] = useState<DisplayBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await bookingsAPI.getMyBookings({ limit: 50 });
      const withNames = await Promise.all(
        res.bookings.map(async (b): Promise<DisplayBooking> => {
          if (b.bookingType === 'ticket') {
            try {
              const event = await eventsAPI.getEventById(b.resourceId);
              return { ...b, displayName: event.name };
            } catch {
              return { ...b, displayName: 'Event Ticket' };
            }
          }
          if (b.bookingType === 'table') {
            return { ...b, displayName: b.metadata?.tableName ?? 'Table Reservation' };
          }
          return { ...b, displayName: b.bookingType === 'apartment' ? 'Stay Reservation' : 'Ride Booking' };
        }),
      );
      setBookings(withNames);
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = bookings.filter((b) => {
    if (activeTab === 'Completed') return b.status === 'COMPLETED';
    if (activeTab === 'Cancelled') return b.status === 'CANCELLED' || b.status === 'EXPIRED';
    // Everything still live: CONFIRMED / CHECKED_IN / ACTIVE plus the unpaid
    // states. This is the tab the checkout screen points people to after a
    // payment problem, so it has to be able to show an awaiting-payment booking.
    return !SETTLED_STATUSES.includes(b.status);
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>My Bookings</Text>

        <ScrollView
          horizontal
          style={styles.tabsScroll}
          contentContainerStyle={styles.tabs}
          showsHorizontalScrollIndicator={false}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={{ padding: 24, gap: 12 }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} height={88} />)}
          </View>
        ) : hasError ? (
          <ErrorState
            title="Couldn't load your bookings"
            subtitle="Something went wrong. Tap to retry."
            onRetry={load}
            fullScreen
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="calendar-check"
            title={`No ${activeTab.toLowerCase()} bookings`}
            subtitle="You haven't booked anything yet. Explore events, venues, stays and rides to start planning."
            ctaLabel="Explore Now"
            onCta={() => navigation.navigate('ExploreTab')}
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const badge = statusToBadge[item.status] ?? { label: item.status, variant: 'upcoming' as const };
              return (
                <TouchableOpacity
                  style={styles.bookingCard}
                  onPress={() => navigation.navigate('BookingConfirmation', { bookingId: item.id })}
                >
                  <View style={styles.iconWrap}>
                    <Icon name={bookingTypeIcon[item.bookingType] ?? 'calendar'} size={18} color={colors.goldEnd} />
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingName} numberOfLines={1}>{item.displayName}</Text>
                    <Text style={styles.bookingMeta}>
                      {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                    <Text style={styles.bookingDetail}>₦{formatNaira(item.totalAmount)}</Text>
                    <BadgePill label={badge.label} variant={badge.variant} />
                  </View>
                  <Icon name="chevron-right" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              );
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  safe: { flex: 1 },
  title: {
    fontFamily: 'PlayfairDisplay-Bold', fontSize: 24, color: colors.textPrimary,
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16,
  },
  tabsScroll: { flexGrow: 0, marginBottom: 16 },
  tabs: { flexDirection: 'row', paddingHorizontal: 24, gap: 10 },
  tab: {
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: colors.borderGold,
  },
  tabActive: { backgroundColor: colors.goldEnd, borderColor: 'transparent' },
  tabText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textSecondary },
  tabTextActive: { color: '#0A0A0F', fontFamily: 'Inter-Bold' },
  list: { paddingHorizontal: 24, gap: 12, paddingBottom: 32 },
  bookingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 16, padding: 14,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: 'rgba(201,151,42,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  bookingInfo: { flex: 1, gap: 3 },
  bookingName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.textPrimary },
  bookingMeta: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted },
  bookingDetail: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: colors.goldEnd, marginBottom: 2 },
});
