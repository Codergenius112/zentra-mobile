import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing,
  Pressable, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { usePaystack } from '../../paystack/PaystackProvider';
import {
  SERVICE_CHARGE, bookingsAPI, paymentsAPI, tablesAPI, ticketsAPI, BackendBooking,
} from '../../services/api';
import { useStore } from '../../store/useStore';
import { GoldButton } from '../../components/GoldButton';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

// Read directly here rather than trusting the provider: babel inlines
// EXPO_PUBLIC_* anywhere, and with an empty key the Paystack modal opens but
// renders a blank sheet that never calls back — a silent dead button otherwise.
const PAYSTACK_KEY = process.env.EXPO_PUBLIC_PAYSTACK_KEY || '';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ─── ROUTE PARAM HAND-TRACE ──────────────────────────────────────────────────
 * Callers pass three shapes with NO discriminant field, so resolveIntent below
 * branches on key presence, in this order. Traced by hand because there is no
 * compiler or runtime available to do it.
 *
 * A3 — venues/SelectTablesScreen.tsx:195 (venue table, no event)
 *   in : { venueId, tableId, tableName, tablePrice, bookingDate, tableCapacity,
 *          quantity: 0, totalPrice: 0, venueName }
 *   Why last-but-one: no existingBookingId, no bookingId, tableId present but
 *   eventId absent, so it must fall through A2 to reach the `p.tableId` branch.
 *   `totalPrice: 0` is a "not supplied" sentinel — the amount is derived from
 *   tablePrice + SERVICE_CHARGE and never read from totalPrice.
 *   `quantity: 0` is likewise ignored; guestCount comes from tableCapacity.
 *   -> { kind:'venueTable', displayTotal: tablePrice + 400 }
 *
 * A1 — EventDetailsScreen.tsx:58 (tickets only)
 *   in : { eventId, venueId, quantity, totalPrice, eventLabel }
 *   No tableId, no bookingId -> falls through to the final `p.eventId` branch.
 *   -> { kind:'tickets', displayTotal: totalPrice + 400 }
 *
 * A2 — events/SelectTablesScreen.tsx:73 (tickets + event-scoped table)
 *   in : { eventId, venueId, quantity, totalPrice, tableId, tableName, tablePrice }
 *   tableId && eventId -> matched BEFORE the bare-tableId branch. One combined
 *   booking, so ONE service charge, not two.
 *   -> { kind:'eventTable', displayTotal: totalPrice + tablePrice + 400 }
 *
 * B  — BookingConfirmationScreen "Complete Payment" CTA
 *   in : { bookingId, totalAmount, bookingType }
 *   Booking already exists -> no create call, straight to charging.
 *
 * C  — ApartmentDetailsScreen.tsx:76 / RideDetailScreen.tsx:85
 *   in : { existingBookingId, existingTotalAmount, existingLabel }
 *   Collapsed into the same 'existing' intent as B; existingLabel is display-only.
 *
 * AMOUNT RULE (evidence: TableBookingScreen.tsx:33 and the comment at
 * ApartmentDetailsScreen.tsx:72-75, "trust the booking's own totalAmount rather
 * than recomputing commission client-side"):
 *   POST the BARE resource price -> DISPLAY bare + SERVICE_CHARGE ->
 *   CHARGE booking.totalAmount from the create response, falling back to the
 *   displayed total only if that is not a finite number > 0.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type ChargeIntent =
  | { kind: 'existing'; bookingId: string; amount: number; label?: string; bookingType?: string }
  | { kind: 'tickets'; eventId: string; venueId?: string; eventLabel?: string; quantity: number; ticketTotal: number }
  | {
      kind: 'eventTable'; eventId: string; venueId?: string; eventLabel?: string;
      tableId: string; tableName: string; tablePrice: number;
      ticketQuantity: number; ticketTotal: number;
    }
  | {
      kind: 'venueTable'; venueId: string; venueName?: string; tableId: string;
      tableName: string; tablePrice: number; bookingDate: string; guestCount: number;
    };

const num = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const resolveIntent = (p: any): ChargeIntent | null => {
  if (!p) return null;

  // Shape C — stay / ride; the detail screen already created the booking.
  if (p.existingBookingId) {
    const amount = num(p.existingTotalAmount);
    if (amount <= 0) return null;
    return {
      kind: 'existing',
      bookingId: String(p.existingBookingId),
      amount,
      label: p.existingLabel ? String(p.existingLabel) : undefined,
      bookingType: p.bookingType ? String(p.bookingType) : undefined,
    };
  }

  // Shape B — booking exists, this is a retry on an unpaid reservation.
  if (p.bookingId) {
    const amount = num(p.totalAmount);
    if (amount <= 0) return null;
    return {
      kind: 'existing',
      bookingId: String(p.bookingId),
      amount,
      label: p.label ? String(p.label) : undefined,
      bookingType: p.bookingType ? String(p.bookingType) : undefined,
    };
  }

  // Shape A2 — event tickets plus an event-scoped table, as ONE booking.
  if (p.tableId && p.eventId) {
    const tablePrice = num(p.tablePrice);
    if (tablePrice <= 0) return null;
    return {
      kind: 'eventTable',
      eventId: String(p.eventId),
      venueId: p.venueId ? String(p.venueId) : undefined,
      eventLabel: p.eventLabel ? String(p.eventLabel) : undefined,
      tableId: String(p.tableId),
      tableName: p.tableName ? String(p.tableName) : 'Table',
      tablePrice,
      ticketQuantity: num(p.quantity),
      ticketTotal: num(p.totalPrice),
    };
  }

  // Shape A3 — venue-scoped table. totalPrice:0 / quantity:0 are sentinels here.
  if (p.tableId) {
    const tablePrice = num(p.tablePrice);
    if (!p.venueId || tablePrice <= 0) return null;
    return {
      kind: 'venueTable',
      venueId: String(p.venueId),
      venueName: p.venueName ? String(p.venueName) : undefined,
      tableId: String(p.tableId),
      tableName: p.tableName ? String(p.tableName) : 'Table',
      tablePrice,
      bookingDate: p.bookingDate ? String(p.bookingDate) : new Date().toISOString(),
      guestCount: Math.max(1, num(p.tableCapacity) || 1),
    };
  }

  // Shape A1 — event tickets only.
  if (p.eventId) {
    const quantity = num(p.quantity);
    const ticketTotal = num(p.totalPrice);
    if (quantity <= 0 || ticketTotal <= 0) return null;
    return {
      kind: 'tickets',
      eventId: String(p.eventId),
      venueId: p.venueId ? String(p.venueId) : undefined,
      eventLabel: p.eventLabel ? String(p.eventLabel) : undefined,
      quantity,
      ticketTotal,
    };
  }

  return null;
};

// What the person sees before paying: the bare resource price plus the flat,
// non-refundable service charge.
const displayTotal = (intent: ChargeIntent): number => {
  switch (intent.kind) {
    case 'existing':   return intent.amount;
    case 'tickets':    return intent.ticketTotal + SERVICE_CHARGE;
    case 'eventTable': return intent.ticketTotal + intent.tablePrice + SERVICE_CHARGE;
    case 'venueTable': return intent.tablePrice + SERVICE_CHARGE;
  }
};

const PAID_STATUSES = ['CONFIRMED', 'CHECKED_IN', 'ACTIVE', 'COMPLETED'];

const isPaid = (b: BackendBooking | undefined | null): boolean => {
  if (!b) return false;
  if (String(b.paymentStatus ?? '').toUpperCase() === 'PAID') return true;
  return PAID_STATUSES.includes(String(b.status ?? '').toUpperCase());
};

const errorMessage = (err: any, fallback: string): string =>
  err?.response?.data?.message || err?.message || fallback;

type Phase =
  | 'review' | 'creating' | 'create-failed'
  | 'charging' | 'verifying'
  | 'success' | 'failed' | 'unresolved';

export const PaymentScreen = ({ route, navigation }: any) => {
  const user = useStore((s) => s.user);
  const addBooking = useStore((s) => s.addBooking);
  const { popup } = usePaystack();

  const intent = useMemo(() => resolveIntent(route?.params), []);
  const total = intent ? displayTotal(intent) : 0;

  const [phase, setPhase] = useState<Phase>('review');
  const [createError, setCreateError] = useState<string | null>(null);
  const [failureReason, setFailureReason] = useState('');
  const [ctaReady, setCtaReady] = useState(false);

  // Refs, not state: these must survive re-renders without triggering them, and
  // bookingRef is the single guard against creating a duplicate reservation.
  const bookingRef = useRef<{ id: string; amount: number; type: string } | null>(null);
  const referenceRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const advanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const mountedRef = useRef(true);

  // ── Animation values (transform/opacity only, so useNativeDriver is safe) ──
  const ringScale = useRef(new Animated.Value(0.4)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const shimmerX = useRef(new Animated.Value(-1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(16)).current;
  const subOpacity = useRef(new Animated.Value(0)).current;
  const subY = useRef(new Animated.Value(16)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      animRef.current?.stop();
      if (advanceRef.current) clearTimeout(advanceRef.current);
    };
  }, []);

  const resetAnimation = useCallback(() => {
    animRef.current?.stop();
    if (advanceRef.current) clearTimeout(advanceRef.current);
    ringScale.setValue(0.4);
    ringOpacity.setValue(0);
    iconScale.setValue(0);
    shimmerX.setValue(-1);
    shakeX.setValue(0);
    titleOpacity.setValue(0);
    titleY.setValue(16);
    subOpacity.setValue(0);
    subY.setValue(16);
    ctaOpacity.setValue(0);
    setCtaReady(false);
  }, [ringScale, ringOpacity, iconScale, shimmerX, shakeX, titleOpacity, titleY, subOpacity, subY, ctaOpacity]);

  // Shared entrance so success and failure read as one system — the same
  // vocabulary BookingConfirmationScreen uses, so the two screens feel connected.
  const playResultAnimation = useCallback((opts: { shake: boolean; advanceTo?: () => void }) => {
    resetAnimation();

    const entrance = Animated.sequence([
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.spring(ringScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
      Animated.spring(iconScale, { toValue: 1, friction: 5, tension: 150, useNativeDriver: true }),
      Animated.timing(shimmerX, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);

    const shake = Animated.sequence([
      Animated.timing(shakeX, { toValue: -10, duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10, duration: 60, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -6, duration: 50, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, easing: Easing.linear, useNativeDriver: true }),
    ]);

    const cascade = Animated.stagger(85, [
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(subOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(subY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.timing(ctaOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]);

    const anim = Animated.sequence([
      entrance,
      ...(opts.shake ? [shake] : []),
      cascade,
    ]);
    animRef.current = anim;

    anim.start(() => {
      if (!mountedRef.current) return;
      setCtaReady(true);
      // Success dwells briefly then advances on its own. Deliberately no receipt
      // here: BookingConfirmation immediately replays its own full celebration,
      // so a second detailed card would make ~6s of fireworks back to back.
      if (opts.advanceTo) {
        advanceRef.current = setTimeout(opts.advanceTo, 1400);
      }
    });
  }, [resetAnimation, ringOpacity, ringScale, iconScale, shimmerX, shakeX, titleOpacity, titleY, subOpacity, subY, ctaOpacity]);

  const goToConfirmation = useCallback(() => {
    // Timer and tap-through race, so only the first one wins.
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (advanceRef.current) clearTimeout(advanceRef.current);
    animRef.current?.stop();
    const id = bookingRef.current?.id;
    // replace, never navigate: Payment must not stay in the back stack where a
    // swipe-back could re-open a screen that has already charged the card.
    if (id) navigation.replace('BookingConfirmation', { bookingId: id });
  }, [navigation]);

  // The Paystack webhook usually lands before our own verify endpoint answers,
  // so re-reading the booking is the more reliable signal — and it reuses a
  // method that already exists rather than depending on a guessed one.
  const verifyWithRetries = useCallback(async (bookingId: string, reference: string): Promise<boolean> => {
    for (const delay of [0, 1500, 3000]) {
      if (!mountedRef.current) return false;
      if (delay > 0) await sleep(delay);
      if (!mountedRef.current) return false;

      try {
        if (isPaid(await bookingsAPI.getBookingById(bookingId))) return true;
      } catch {}

      try {
        const v = await paymentsAPI.verifyPayment(reference, bookingId);
        if (v.verified || isPaid(v.booking)) return true;
      } catch {}
    }
    return false;
  }, []);

  const handlePaid = useCallback(async (bookingId: string, reference: string) => {
    if (!mountedRef.current) return;
    setPhase('verifying');
    const confirmed = await verifyWithRetries(bookingId, reference);
    if (!mountedRef.current) return;

    if (confirmed) {
      setPhase('success');
      playResultAnimation({ shake: false, advanceTo: goToConfirmation });
    } else {
      // Charged, but the server could not confirm it. Amber and still — a shake
      // reads as "you did something wrong", and here the user did everything
      // right and may be out of pocket. Never auto-navigates away.
      setPhase('unresolved');
      playResultAnimation({ shake: false });
    }
  }, [verifyWithRetries, playResultAnimation, goToConfirmation]);

  const createBooking = useCallback(async (): Promise<BackendBooking> => {
    if (!intent) throw new Error('Nothing to book');
    switch (intent.kind) {
      case 'tickets':
        return ticketsAPI.createTicket({
          eventId: intent.eventId,
          venueId: intent.venueId ?? null,
          quantity: intent.quantity,
          price: intent.ticketTotal, // bare, no service charge
        });
      case 'eventTable':
        return tablesAPI.bookTable({
          eventId: intent.eventId,
          venueId: intent.venueId ?? null,
          tableId: intent.tableId,
          tableNumber: intent.tableName,
          guestCount: Math.max(1, intent.ticketQuantity),
          price: intent.tablePrice, // bare
          ticketQuantity: intent.ticketQuantity,
          ticketTotal: intent.ticketTotal,
        });
      case 'venueTable':
        return tablesAPI.bookTable({
          venueId: intent.venueId,
          venueName: intent.venueName,
          tableId: intent.tableId,
          tableNumber: intent.tableName,
          guestCount: intent.guestCount,
          bookingDate: intent.bookingDate,
          price: intent.tablePrice, // bare
        });
      default:
        throw new Error('Booking already exists');
    }
  }, [intent]);

  const startCharge = useCallback(async () => {
    if (!intent) return;
    const email = user?.email;
    if (!email) return;

    // INVARIANT: never create a booking while bookingRef holds one. Every retry
    // path routes through here, and this is what makes "Try Again" charge the
    // same reservation instead of reserving a second table.
    if (!bookingRef.current) {
      if (intent.kind === 'existing') {
        bookingRef.current = {
          id: intent.bookingId,
          amount: intent.amount,
          type: intent.bookingType ?? 'booking',
        };
      } else {
        setPhase('creating');
        setCreateError(null);
        try {
          const created = await createBooking();
          if (!created?.id) throw new Error('The server did not return a booking reference.');
          const serverTotal = Number(created.totalAmount);
          bookingRef.current = {
            id: created.id,
            amount: Number.isFinite(serverTotal) && serverTotal > 0 ? serverTotal : displayTotal(intent),
            type: created.bookingType || intent.kind,
          };
          addBooking(created);
        } catch (err) {
          if (!mountedRef.current) return;
          // Nothing was charged and nothing was reserved, so this stays an
          // inline banner rather than a cinematic failure — retrying here is
          // safe precisely because bookingRef is still null.
          setCreateError(errorMessage(err, "We couldn't reserve this for you. Please try again."));
          setPhase('create-failed');
          return;
        }
      }
    }

    if (!mountedRef.current) return;
    const held = bookingRef.current;
    if (!held || !Number.isFinite(held.amount) || held.amount <= 0) return;

    referenceRef.current = `ZTR-${held.id.slice(0, 8).toUpperCase()}-${Date.now()}`;
    setPhase('charging');

    popup.checkout({
      email,
      // NAIRA, not kobo — our provider multiplies by 100 internally
      // (src/paystack/PaystackProvider.tsx, toKobo), matching the contract
      // the react-native-paystack-webview library used.
      amount: held.amount,
      reference: referenceRef.current,
      metadata: { bookingId: held.id, bookingType: held.type },
      onSuccess: async (res: any) => {
        const ref = res?.reference ? String(res.reference) : referenceRef.current!;
        referenceRef.current = ref;
        await handlePaid(held.id, ref);
      },
      onCancel: () => {
        if (!mountedRef.current) return;
        // onCancel is the ONLY signal that means definitely-not-charged.
        setFailureReason(
          bookingRef.current && intent.kind !== 'existing'
            ? 'Your reservation is being held but is not paid for yet.'
            : 'You cancelled the payment. Nothing was charged.',
        );
        setPhase('failed');
        playResultAnimation({ shake: true });
      },
      // Unlike the stock library (which never fired onError), our provider
      // can — intentionally unused here so a Paystack-side error keeps the
      // existing escape-hatch flow: the "Payment window closed without a
      // result?" button in the charging UI.
      onError: () => {},
    });
  }, [intent, user?.email, createBooking, addBooking, popup, handlePaid, playResultAnimation]);

  // A silently dismissed modal is UNKNOWN, not cancelled — the only way to cover
  // the fact that onError never fires.
  const handleWindowClosed = useCallback(async () => {
    const held = bookingRef.current;
    if (!held) {
      setPhase('review');
      return;
    }
    if (referenceRef.current) {
      await handlePaid(held.id, referenceRef.current);
    } else {
      setFailureReason('The payment window closed before returning a result. Nothing was charged.');
      setPhase('failed');
      playResultAnimation({ shake: true });
    }
  }, [handlePaid, playResultAnimation]);

  // ── Line items for the review card ────────────────────────────────────────
  const lineItems = useMemo(() => {
    if (!intent) return [] as { label: string; value: string; highlight?: boolean }[];
    switch (intent.kind) {
      case 'existing':
        return [
          { label: 'Booking', value: intent.label ?? 'Existing reservation' },
          { label: 'Total due', value: `₦${formatNaira(intent.amount)}`, highlight: true },
        ];
      case 'tickets':
        return [
          { label: 'Event', value: intent.eventLabel ?? 'Event tickets' },
          { label: 'Tickets', value: `${intent.quantity} × ₦${formatNaira(intent.ticketTotal / intent.quantity)}` },
          { label: 'Service charge', value: `₦${formatNaira(SERVICE_CHARGE)}` },
          { label: 'Total', value: `₦${formatNaira(total)}`, highlight: true },
        ];
      case 'eventTable':
        return [
          { label: 'Event', value: intent.eventLabel ?? 'Event' },
          { label: 'Table', value: intent.tableName },
          ...(intent.ticketQuantity > 0
            ? [{ label: `Tickets (${intent.ticketQuantity})`, value: `₦${formatNaira(intent.ticketTotal)}` }]
            : []),
          { label: 'Table', value: `₦${formatNaira(intent.tablePrice)}` },
          { label: 'Service charge', value: `₦${formatNaira(SERVICE_CHARGE)}` },
          { label: 'Total', value: `₦${formatNaira(total)}`, highlight: true },
        ];
      case 'venueTable':
        return [
          { label: 'Venue', value: intent.venueName ?? 'Venue' },
          { label: 'Table', value: intent.tableName },
          {
            label: 'Date',
            value: new Date(intent.bookingDate).toLocaleDateString('en-GB', {
              weekday: 'short', day: 'numeric', month: 'short',
            }),
          },
          { label: 'Guests', value: `Up to ${intent.guestCount}` },
          { label: 'Min spend', value: `₦${formatNaira(intent.tablePrice)}` },
          { label: 'Service charge', value: `₦${formatNaira(SERVICE_CHARGE)}` },
          { label: 'Total', value: `₦${formatNaira(total)}`, highlight: true },
        ];
    }
  }, [intent, total]);

  // ── Guard: unusable params or an unconfigured build ───────────────────────
  const blocker = !intent
    ? 'This checkout link is incomplete. Go back and try again.'
    : !PAYSTACK_KEY
      ? 'Payments are not configured in this build.'
      : !user?.email
        ? 'Your account has no email address, which Paystack requires to take a payment.'
        : null;

  if (blocker) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe}>
          <Header navigation={navigation} />
          <View style={styles.blockedWrap}>
            <View style={styles.blockedIcon}>
              <Icon name="triangle-exclamation" size={26} color={colors.warning} />
            </View>
            <Text style={styles.blockedTitle}>Can't start this payment</Text>
            <Text style={styles.blockedText}>{blocker}</Text>
            <GoldButton title="Go Back" onPress={() => navigation.goBack()} variant="secondary" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const shimmerTranslate = shimmerX.interpolate({ inputRange: [-1, 1], outputRange: [-140, 140] });
  const busy = phase === 'creating' || phase === 'charging' || phase === 'verifying';

  // ── Result overlays ───────────────────────────────────────────────────────
  if (phase === 'success' || phase === 'failed' || phase === 'unresolved') {
    const isSuccess = phase === 'success';
    const isUnresolved = phase === 'unresolved';

    const accent = isSuccess ? colors.goldEnd : isUnresolved ? colors.warning : '#F87171';
    // Explicit tuple annotation — LinearGradient's `colors` prop requires at
    // least 2 elements typed as a tuple, and the ternary alone widens to string[].
    const glow: [string, string] = isSuccess
      ? ['rgba(245,200,66,0.16)', 'rgba(245,200,66,0.04)']
      : isUnresolved
        ? ['rgba(232,184,75,0.16)', 'rgba(232,184,75,0.04)']
        : ['rgba(248,113,113,0.16)', 'rgba(248,113,113,0.04)'];
    const iconName = isSuccess ? 'check' : isUnresolved ? 'triangle-exclamation' : 'xmark';

    const title = isSuccess
      ? 'Payment Successful'
      : isUnresolved
        ? 'Payment needs confirming'
        : 'Payment Failed';

    const subtitle = isSuccess
      ? `₦${formatNaira(bookingRef.current?.amount ?? total)} paid`
      : isUnresolved
        ? 'Your card was charged, but we could not confirm it with our server. This usually resolves on its own within a few minutes.'
        : failureReason || 'Your payment did not go through. Nothing was charged.';

    return (
      // Tap anywhere to skip the success animation — timer and tap race, and
      // goToConfirmation is guarded so only the first one navigates.
      <Pressable style={styles.container} onPress={isSuccess ? goToConfirmation : undefined}>
        <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.resultSafe}>
          <View style={styles.resultWrap}>
            <Animated.View
              style={[
                styles.resultRing,
                { opacity: ringOpacity, transform: [{ scale: ringScale }, { translateX: shakeX }] },
              ]}
            >
              <LinearGradient colors={glow} style={styles.resultRingGrad}>
                <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                  <LinearGradient
                    colors={isSuccess ? [colors.goldStart, colors.goldEnd] : [accent, accent]}
                    style={styles.resultCircle}
                  >
                    <Icon name={iconName} size={28} color="#0A0A0F" />
                  </LinearGradient>
                </Animated.View>
                <Animated.View
                  style={[styles.shimmerBar, { transform: [{ translateX: shimmerTranslate }, { rotate: '20deg' }] }]}
                  pointerEvents="none"
                />
              </LinearGradient>
            </Animated.View>

            <Animated.Text style={[styles.resultTitle, { color: accent, opacity: titleOpacity, transform: [{ translateY: titleY }] }]}>
              {title}
            </Animated.Text>
            <Animated.Text style={[styles.resultSubtitle, { opacity: subOpacity, transform: [{ translateY: subY }] }]}>
              {subtitle}
            </Animated.Text>

            {/* The dangerous state: money left the account and the server has
                not confirmed it. Reference is selectable so it can be quoted to
                support — no clipboard dependency is installed, so there is
                deliberately no "Copy" button promising a toast. */}
            {isUnresolved && (
              <Animated.View style={[styles.refCard, { opacity: subOpacity }]}>
                <Text style={styles.refLabel}>Paystack reference</Text>
                <Text selectable style={styles.refValue}>{referenceRef.current ?? '—'}</Text>
                <Text style={styles.refLabel}>Booking</Text>
                <Text selectable style={styles.refValue}>{bookingRef.current?.id ?? '—'}</Text>
                <Text style={styles.refLabel}>Amount</Text>
                <Text selectable style={styles.refValue}>₦{formatNaira(bookingRef.current?.amount ?? total)}</Text>
              </Animated.View>
            )}

            {ctaReady && (
              <Animated.View style={[styles.resultCtas, { opacity: ctaOpacity }]}>
                {isSuccess && (
                  <GoldButton title="Continue" onPress={goToConfirmation} />
                )}

                {phase === 'failed' && (
                  <>
                    {/* Reuses bookingRef, so this never creates a second booking. */}
                    <GoldButton title="Try Payment Again" onPress={startCharge} style={{ marginBottom: 12 }} />
                    <GoldButton
                      title="View Booking"
                      onPress={goToConfirmation}
                      variant="secondary"
                      style={{ marginBottom: 12 }}
                    />
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                      <Text style={styles.ghostLink}>Back</Text>
                    </TouchableOpacity>
                  </>
                )}

                {isUnresolved && (
                  <>
                    <GoldButton
                      title="Re-check Payment"
                      onPress={() => {
                        const held = bookingRef.current;
                        if (held && referenceRef.current) handlePaid(held.id, referenceRef.current);
                      }}
                      style={{ marginBottom: 12 }}
                    />
                    <GoldButton
                      title="Go to My Booking"
                      onPress={goToConfirmation}
                      variant="secondary"
                      style={{ marginBottom: 12 }}
                    />
                  </>
                )}
              </Animated.View>
            )}
          </View>
        </SafeAreaView>
      </Pressable>
    );
  }

  // ── Review / in-flight ────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <Header navigation={navigation} canGoBack={!busy} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Checkout</Text>

          {phase === 'create-failed' && createError && (
            <View style={styles.banner}>
              <Icon name="circle-exclamation" size={14} color="#F87171" />
              <Text style={styles.bannerText}>{createError}</Text>
            </View>
          )}

          <View style={styles.card}>
            {lineItems.map((item, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.rowLabel}>{item.label}</Text>
                <Text style={[styles.rowValue, item.highlight && styles.rowHighlight]}>{item.value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.serviceNote}>
            Service charge is ₦{formatNaira(SERVICE_CHARGE)} and is non-refundable.
          </Text>

          {busy && (
            <View style={styles.busyWrap}>
              <ActivityIndicator color={colors.goldEnd} />
              <Text style={styles.busyText}>
                {phase === 'creating'
                  ? 'Reserving your spot…'
                  : phase === 'charging'
                    ? 'Waiting for your bank…'
                    : 'Confirming your payment…'}
              </Text>

              {/* onError never fires in this library version, so a silently
                  dismissed modal would otherwise hang on this spinner forever. */}
              {phase === 'charging' && (
                <TouchableOpacity style={styles.escapeBtn} onPress={handleWindowClosed}>
                  <Text style={styles.escapeText}>Payment window closed without a result?</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>

        {!busy && (
          <View style={styles.bottomCta}>
            <GoldButton
              title={phase === 'create-failed' ? 'Try Again' : `Pay ₦${formatNaira(total)}`}
              onPress={startCharge}
            />
            <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const Header = ({ navigation, canGoBack = true }: { navigation: any; canGoBack?: boolean }) => (
  <View style={styles.header}>
    <TouchableOpacity
      style={styles.backBtn}
      onPress={() => navigation.goBack()}
      disabled={!canGoBack}
      activeOpacity={0.7}
    >
      <Icon name="chevron-left" size={16} color={canGoBack ? colors.textPrimary : colors.textMuted} />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>Payment</Text>
    <View style={styles.backBtn} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 17, color: colors.textPrimary },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
  pageTitle: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 26, color: colors.textPrimary, marginBottom: 18 },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 20, padding: 20,
    ...shadows.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rowLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textMuted, flex: 1 },
  rowValue: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.textPrimary, textAlign: 'right', marginLeft: 12 },
  rowHighlight: { color: colors.goldEnd, fontFamily: 'Inter-Bold', fontSize: 17 },
  serviceNote: {
    fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted,
    marginTop: 12, lineHeight: 17,
  },
  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.30)',
    borderRadius: 14, padding: 14, marginBottom: 16,
  },
  bannerText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#FCA5A5', lineHeight: 18 },
  busyWrap: { alignItems: 'center', gap: 12, marginTop: 34 },
  busyText: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textSecondary },
  escapeBtn: {
    marginTop: 10, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, borderColor: colors.borderGold,
    backgroundColor: colors.cardBg,
  },
  escapeText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.goldEnd },
  bottomCta: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16 },
  cancelLink: { alignItems: 'center', marginTop: 14 },
  cancelText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textMuted },
  blockedWrap: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', gap: 14 },
  blockedIcon: {
    width: 76, height: 76, borderRadius: 38, alignSelf: 'center',
    backgroundColor: 'rgba(232,184,75,0.12)',
    borderWidth: 1, borderColor: 'rgba(232,184,75,0.32)',
    alignItems: 'center', justifyContent: 'center',
  },
  blockedTitle: {
    fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: colors.textPrimary, textAlign: 'center',
  },
  blockedText: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 20, marginBottom: 12,
  },
  resultSafe: { flex: 1 },
  resultWrap: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center' },
  resultRing: { marginBottom: 20 },
  resultRingGrad: {
    width: 128, height: 128, borderRadius: 64,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  resultCircle: {
    width: 82, height: 82, borderRadius: 41,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.goldGlowLg,
  },
  shimmerBar: { position: 'absolute', width: 30, height: 170, backgroundColor: 'rgba(255,255,255,0.22)' },
  resultTitle: {
    fontFamily: 'PlayfairDisplay-Bold', fontSize: 27, textAlign: 'center', marginBottom: 10,
  },
  resultSubtitle: {
    fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, paddingHorizontal: 12,
  },
  refCard: {
    marginTop: 22, padding: 16, borderRadius: 16, alignSelf: 'stretch',
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
  },
  refLabel: { fontFamily: 'Inter-Medium', fontSize: 10, color: colors.textMuted, marginBottom: 3, marginTop: 8 },
  refValue: { fontFamily: MONO, fontSize: 12, color: colors.textPrimary },
  resultCtas: { alignSelf: 'stretch', marginTop: 28 },
  ghostLink: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});