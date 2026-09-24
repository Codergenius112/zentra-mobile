import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import {
  bookingsAPI, eventsAPI, tableListingsAPI, BackendBooking,
} from '../../services/api';
import { useStore } from '../../store/useStore';
import { GoldButton } from '../../components/GoldButton';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

interface ResolvedDetails {
  name: string;
  dateLabel: string;
  extra?: string; // "3 tickets" or "Table 5"
}

const CANCELLED_STATUSES = ['CANCELLED', 'EXPIRED'];
// Booking exists on the backend but no charge has actually landed yet —
// neither of these should ever be shown as "Total Paid".
const PENDING_PAYMENT_STATUSES = ['INITIATED', 'PENDING_PAYMENT'];
const UNPAID_STATUSES = [...PENDING_PAYMENT_STATUSES, 'PENDING_GROUP_PAYMENT'];

export const BookingConfirmationScreen = ({ route, navigation }: any) => {
  const { bookingId } = route.params;
  const addBooking = useStore((s) => s.addBooking);

  const [booking, setBooking] = useState<BackendBooking | null>(null);
  const [details, setDetails] = useState<ResolvedDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // ── Cinematic entrance sequence ──────────────────────────────────────────
  const ringScale   = useRef(new Animated.Value(0.4)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const checkScale  = useRef(new Animated.Value(0)).current;
  const shimmerX    = useRef(new Animated.Value(-1)).current;
  const breathe     = useRef(new Animated.Value(1)).current;
  const titleY      = useRef(new Animated.Value(16)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY   = useRef(new Animated.Value(16)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const cardY       = useRef(new Animated.Value(24)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const ctaOpacity  = useRef(new Animated.Value(0)).current;
  // Handle of the looping breathe animation so it can be stopped on unmount —
  // Animated.loop() runs forever otherwise, even after the screen is gone.
  const breatheLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const b = await bookingsAPI.getBookingById(bookingId);
        setBooking(b);
        addBooking(b);

        if (b.bookingType === 'ticket') {
          const event = await eventsAPI.getEventById(b.resourceId);
          setDetails({
            name: event.name,
            dateLabel: new Date(event.startDate).toLocaleString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            }),
            extra: `${b.guestCount} ticket${b.guestCount > 1 ? 's' : ''}`,
          });
        } else if (b.bookingType === 'table') {
          const scopeEventId = b.metadata?.eventId;
          const scopeVenueId = b.metadata?.venueId;
          let tableName = b.metadata?.tableName as string | undefined;
          let eventName: string | undefined;

          if (!tableName) {
            const res = scopeVenueId
              ? await tableListingsAPI.getVenueTables(scopeVenueId)
              : scopeEventId
              ? await tableListingsAPI.getEventTables(scopeEventId)
              : null;
            tableName = res?.tables.find((t) => t.id === b.resourceId)?.name;
          }
          if (scopeEventId) {
            try {
              const event = await eventsAPI.getEventById(scopeEventId);
              eventName = event.name;
            } catch {}
          }

          setDetails({
            name: eventName ?? tableName ?? 'Table Reservation',
            dateLabel: b.metadata?.bookingDate
              ? new Date(b.metadata.bookingDate).toLocaleString('en-GB', {
                  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })
              : new Date(b.createdAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
            extra: tableName,
          });
        } else {
          const checkInOrPickup = b.metadata?.checkInDate ?? b.metadata?.pickupDate;
          setDetails({
            name: b.bookingType === 'apartment' ? 'Stay Reservation' : 'Ride Booking',
            dateLabel: checkInOrPickup
              ? new Date(checkInOrPickup).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
              : new Date(b.createdAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
          });
        }
      } catch (err) {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [bookingId]);

  // Kick off the cinematic sequence once data is ready — skipped entirely
  // for cancelled/expired bookings and for bookings nothing has actually
  // been paid on yet (INITIATED/PENDING_PAYMENT), which render separate,
  // deliberately subdued states below instead.
  useEffect(() => {
    if (!booking || CANCELLED_STATUSES.includes(booking.status)) return;
    if (PENDING_PAYMENT_STATUSES.includes(booking.status)) return;

    Animated.sequence([
      // Ring materializes
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(ringScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
      // Checkmark pops in with a slight overshoot
      Animated.spring(checkScale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
      // Shimmer sweeps across the ring once
      Animated.timing(shimmerX, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      // Text and card cascade in
      Animated.stagger(90, [
        Animated.parallel([
          Animated.timing(titleOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(titleY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(subtitleOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(subtitleY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(cardOpacity, { toValue: 1, duration: 360, useNativeDriver: true }),
          Animated.timing(cardY, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
        Animated.timing(ctaOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => {
      // Gentle continuous breathing glow once everything has settled in —
      // subtle, not distracting, just enough to feel alive.
      breatheLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1.06, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      );
      breatheLoopRef.current.start();
    });

    // Stop the loop on unmount (and before the next run) — otherwise it
    // keeps animating in the background for the lifetime of the app.
    return () => {
      breatheLoopRef.current?.stop();
      breatheLoopRef.current = null;
    };
  }, [booking?.id]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ padding: 24, gap: 16, flex: 1, justifyContent: 'center' }}>
          <SkeletonCard height={80} />
          <SkeletonCard height={160} />
          <SkeletonCard height={56} />
        </SafeAreaView>
      </View>
    );
  }

  if (hasError || !booking) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <ErrorState
            title="Couldn't load this booking"
            subtitle="Your payment may still have gone through — check My Bookings."
            onRetry={() => navigation.replace('BookingConfirmation', { bookingId })}
          />
        </SafeAreaView>
      </View>
    );
  }

  // ── Cancelled / expired: deliberately plain, no celebration ──────────────
  if (CANCELLED_STATUSES.includes(booking.status)) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.cancelledWrap}>
              <View style={styles.cancelledIconWrap}>
                <Icon name="circle-xmark" size={40} color={colors.textMuted} />
              </View>
              <Text style={styles.cancelledTitle}>
                {booking.status === 'EXPIRED' ? 'Booking Expired' : 'Booking Cancelled'}
              </Text>
              <Text style={styles.cancelledSubtitle}>{details?.name}</Text>
            </View>

            <View style={styles.bookingCard}>
              <View style={styles.bookingCardHeader}>
                <Text style={styles.bookingRef}>Booking Ref</Text>
                <Text style={styles.bookingRefValue}>{booking.id.slice(0, 8).toUpperCase()}</Text>
              </View>
              <View style={styles.divider} />
              {[
                { label: booking.bookingType === 'ticket' ? 'Event' : 'Booking', value: details?.name },
                { label: 'Date', value: details?.dateLabel },
                { label: 'Amount', value: `₦${formatNaira(booking.totalAmount)}` },
              ].map((item, i) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={styles.detailValue}>{item.value}</Text>
                </View>
              ))}
            </View>

            <GoldButton
              title="View My Bookings"
              onPress={() => navigation.navigate('MyBookings')}
              variant="secondary"
              style={{ marginBottom: 12 }}
            />
            <TouchableOpacity style={styles.homeLink} onPress={() => navigation.navigate('HomeTab')}>
              <Text style={styles.homeLinkText}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Initiated / pending payment: booking exists, nothing charged yet ─────
  // No checkmark, no "Total Paid" — the earlier version of this screen
  // showed both regardless of status, which is wrong: the CTA below is the
  // only completed step (creating a Paystack-linked booking record).
  if (PENDING_PAYMENT_STATUSES.includes(booking.status)) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.cancelledWrap}>
              <View style={styles.cancelledIconWrap}>
                <Icon name="clock" size={36} color={colors.goldMid} />
              </View>
              <Text style={styles.cancelledTitle}>Payment Not Completed</Text>
              <Text style={styles.cancelledSubtitle}>
                {details?.name} — this booking is on hold and hasn't been charged yet.
              </Text>
            </View>

            <View style={styles.bookingCard}>
              <View style={styles.bookingCardHeader}>
                <Text style={styles.bookingRef}>Booking Ref</Text>
                <Text style={styles.bookingRefValue}>{booking.id.slice(0, 8).toUpperCase()}</Text>
              </View>
              <View style={styles.divider} />
              {[
                { label: booking.bookingType === 'ticket' ? 'Event' : 'Booking', value: details?.name },
                { label: 'Date', value: details?.dateLabel },
                { label: 'Amount Due', value: `₦${formatNaira(booking.totalAmount)}`, highlight: true },
              ].map((item, i) => (
                <View key={i} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={[styles.detailValue, (item as any).highlight && styles.detailHighlight]}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={styles.emailNote}>
              Nothing has been charged yet — pick up where you left off.
            </Text>

            <GoldButton
              title="Complete Payment"
              onPress={() => navigation.navigate('Payment', {
                bookingId: booking.id,
                totalAmount: booking.totalAmount,
                bookingType: booking.bookingType,
                label: details?.name,
              })}
              style={{ marginBottom: 12 }}
            />
            <GoldButton
              title="View My Bookings"
              onPress={() => navigation.navigate('MyBookings')}
              variant="secondary"
              style={{ marginBottom: 12 }}
            />
            <TouchableOpacity style={styles.homeLink} onPress={() => navigation.navigate('HomeTab')}>
              <Text style={styles.homeLinkText}>Back to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const shimmerTranslate = shimmerX.interpolate({ inputRange: [-1, 1], outputRange: [-140, 140] });

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Success Icon — cinematic entrance */}
          <View style={styles.successWrap}>
            <Animated.View
              style={[
                styles.checkRing,
                { opacity: ringOpacity, transform: [{ scale: Animated.multiply(ringScale, breathe) }] },
              ]}
            >
              <LinearGradient
                colors={['rgba(46,204,113,0.15)', 'rgba(46,204,113,0.05)']}
                style={styles.checkRingGrad}
              >
                <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                  <LinearGradient colors={[colors.goldStart, colors.goldEnd]} style={styles.checkCircle}>
                    <Icon name="check" size={28} color="#0A0A0F" />
                  </LinearGradient>
                </Animated.View>
                {/* One-time shimmer sweep */}
                <Animated.View
                  style={[styles.shimmerBar, { transform: [{ translateX: shimmerTranslate }, { rotate: '20deg' }] }]}
                  pointerEvents="none"
                />
              </LinearGradient>
            </Animated.View>

            <Animated.Text
              style={[styles.confirmedTitle, { opacity: titleOpacity, transform: [{ translateY: titleY }] }]}
            >
              {booking.status === 'PENDING_GROUP_PAYMENT' ? 'Group Booking Started' : 'Booking Confirmed!'}
            </Animated.Text>
            <Animated.Text
              style={[styles.confirmedSubtitle, { opacity: subtitleOpacity, transform: [{ translateY: subtitleY }] }]}
            >
              {details?.name}
            </Animated.Text>
          </View>

          {/* Booking Card */}
          <Animated.View style={[styles.bookingCard, { opacity: cardOpacity, transform: [{ translateY: cardY }] }]}>
            <View style={styles.bookingCardHeader}>
              <Text style={styles.bookingRef}>Booking Ref</Text>
              <Text style={styles.bookingRefValue}>{booking.id.slice(0, 8).toUpperCase()}</Text>
            </View>
            <View style={styles.divider} />
            {[
              { label: booking.bookingType === 'ticket' ? 'Event' : 'Booking', value: details?.name },
              { label: 'Date', value: details?.dateLabel },
              details?.extra && { label: booking.bookingType === 'ticket' ? 'Tickets' : 'Table', value: details.extra },
              {
                // PENDING_GROUP_PAYMENT reaches this branch too, and nothing
                // has actually been charged for it yet — "Total Paid" would be false.
                label: booking.status === 'PENDING_GROUP_PAYMENT' ? 'Total Due' : 'Total Paid',
                value: `₦${formatNaira(booking.totalAmount)}`,
                highlight: true,
              },
            ].filter(Boolean).map((item: any, i) => (
              <View key={i} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={[styles.detailValue, item.highlight && styles.detailHighlight]}>
                  {item.value}
                </Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View style={{ opacity: ctaOpacity }}>
            <Text style={styles.emailNote}>
              A confirmation has been sent to your email address.
            </Text>

            {/* CTAs */}
            <GoldButton
              title="View Itinerary"
              onPress={() => navigation.navigate('NightTab')}
              style={{ marginBottom: 12 }}
            />
            {booking.bookingType === 'table' && booking.status === 'CONFIRMED' && (
              <GoldButton
                title="Order at Table"
                onPress={() => navigation.navigate('TableOrder', {
                  bookingId: booking.id,
                  venueId: booking.metadata?.venueId,
                  tableId: booking.resourceId,
                  tableName: details?.extra ?? details?.name,
                })}
                variant="secondary"
                style={{ marginBottom: 12 }}
              />
            )}
            {booking.bookingType === 'ticket' && ['CONFIRMED', 'CHECKED_IN'].includes(booking.status) && (
              <GoldButton
                title="View Ticket"
                onPress={() => navigation.navigate('Ticket', { ticketId: booking.id })}
                variant="secondary"
                style={{ marginBottom: 12 }}
              />
            )}
            {booking.status === 'PENDING_GROUP_PAYMENT' && (
              <GoldButton
                title="Settle Full Amount"
                onPress={() => navigation.navigate('Payment', {
                  bookingId: booking.id,
                  totalAmount: booking.totalAmount,
                  bookingType: booking.bookingType,
                  label: details?.name,
                })}
                variant="secondary"
                style={{ marginBottom: 12 }}
              />
            )}
            <GoldButton
              title="View Booking"
              onPress={() => navigation.navigate('MyBookings')}
              variant="secondary"
              style={{ marginBottom: 12 }}
            />
            <TouchableOpacity
              style={styles.homeLink}
              onPress={() => navigation.navigate('HomeTab')}
            >
              <Text style={styles.homeLinkText}>Back to Home</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  successWrap: { alignItems: 'center', gap: 12, marginBottom: 28 },
  checkRing: { marginBottom: 8 },
  checkRingGrad: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  checkCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.goldGlowLg,
  },
  shimmerBar: {
    position: 'absolute', width: 30, height: 160,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  confirmedTitle: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 28, color: colors.goldEnd, textAlign: 'center' },
  confirmedSubtitle: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, paddingHorizontal: 20,
  },
  bookingCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 20, padding: 20, marginBottom: 16,
  },
  bookingCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  bookingRef: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.textMuted },
  bookingRefValue: { fontFamily: 'Inter-Bold', fontSize: 13, color: colors.goldEnd },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textMuted },
  detailValue: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.textPrimary },
  detailHighlight: { color: colors.goldEnd, fontFamily: 'Inter-Bold', fontSize: 15 },
  emailNote: {
    fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted,
    textAlign: 'center', marginBottom: 24,
  },
  homeLink: { alignItems: 'center', marginTop: 4 },
  homeLinkText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textMuted },
  // Cancelled state — deliberately muted, no gold/celebration treatment
  cancelledWrap: { alignItems: 'center', gap: 12, marginBottom: 28 },
  cancelledIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  cancelledTitle: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 26, color: colors.textSecondary, textAlign: 'center' },
  cancelledSubtitle: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textMuted,
    textAlign: 'center', lineHeight: 22, paddingHorizontal: 20,
  },
});