import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { SERVICE_CHARGE, bookingsAPI } from '../../services/api';
import { useStore } from '../../store/useStore';
import { GoldButton } from '../../components/GoldButton';
import { Stepper } from '../../components/Stepper';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

/**
 * Three call sites reach this screen with three different param shapes and no
 * discriminant, so resolveDraft narrows all of them into one GroupDraft:
 *
 *   events/SelectTablesScreen.tsx:87   { eventId, venueId, tableId, tableName,
 *                                        tablePrice, maxGuests, ticketQty, ticketTotal }
 *   venues/SelectTablesScreen.tsx:209  { venueId, venueName, tableId, tableName,
 *                                        tablePrice, maxGuests, bookingDate }
 *   tables/TableBookingScreen.tsx:54   { bookingType, selectedItem:{ id, venueId,
 *                                        name, capacity, price }, basePrice,
 *                                        tableBookingDetails:{ bookingDate,
 *                                        guestCount, tableNumber, venueName } }
 *
 * The third is the orphan screen — supported so it still type-checks and works
 * if it is ever wired in, not because anything reaches it today.
 */
interface GroupDraft {
  tableId: string;
  tableName: string;
  tablePrice: number;
  venueId?: string | null;
  venueName?: string;
  eventId?: string | null;
  eventLabel?: string;
  bookingDate?: string;
  maxGuests: number;
  ticketQuantity: number;
  ticketTotal: number;
}

const num = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const str = (value: any): string | undefined =>
  value === undefined || value === null || value === '' ? undefined : String(value);

const resolveDraft = (p: any): GroupDraft | null => {
  if (!p) return null;

  // The orphan shape nests everything under selectedItem / tableBookingDetails.
  const item = p.selectedItem ?? {};
  const details = p.tableBookingDetails ?? {};

  const tableId = str(p.tableId) ?? str(item.id);
  if (!tableId) return null;

  const tablePrice = num(p.tablePrice) || num(p.basePrice) || num(item.price);
  if (tablePrice <= 0) return null;

  const maxGuests = num(p.maxGuests) || num(item.capacity);

  return {
    tableId,
    tableName: str(p.tableName) ?? str(details.tableNumber) ?? str(item.name) ?? 'Table',
    tablePrice,
    venueId: str(p.venueId) ?? str(item.venueId) ?? null,
    venueName: str(p.venueName) ?? str(details.venueName),
    eventId: str(p.eventId) ?? null,
    eventLabel: str(p.eventLabel),
    bookingDate: str(p.bookingDate) ?? str(details.bookingDate),
    // A table with no reported capacity still has to allow a split; 10 matches
    // Stepper's own default max.
    maxGuests: maxGuests > 1 ? maxGuests : 10,
    ticketQuantity: num(p.ticketQty),
    ticketTotal: num(p.ticketTotal),
  };
};

const dateLabel = (iso?: string): string => {
  if (!iso) return 'Date to be confirmed';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Date to be confirmed';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const GroupBookingScreen = ({ route, navigation }: any) => {
  const addBooking = useStore((s) => s.addBooking);

  const draft = useMemo(() => resolveDraft(route?.params), [route?.params]);

  const [people, setPeople] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // One number drives both the split and the table's guest count: they are the
  // same population, and two steppers for one thing invites them to disagree.
  const total = draft ? draft.tablePrice + draft.ticketTotal + SERVICE_CHARGE : 0;
  const perPerson = people > 0 ? Math.ceil(total / people) : total;

  const handleShare = useCallback(async () => {
    if (!draft) return;
    const where = draft.eventLabel ?? draft.venueName ?? 'the venue';
    try {
      // Plain text on purpose. app.json declares no `scheme` and expo-linking is
      // not installed, so a zentra:// link in this message would be a broken
      // promise to whoever taps it.
      await Share.share({
        message:
          `I'm reserving ${draft.tableName} at ${where} for ${dateLabel(draft.bookingDate)}.\n\n` +
          `Table total: ₦${formatNaira(total)}\n` +
          `Split ${people} ways: about ₦${formatNaira(perPerson)} each\n\n` +
          `Reply to confirm your share — the table is held until everyone has paid.`,
      });
    } catch {
      // A dismissed share sheet is not an error worth interrupting for.
    }
  }, [draft, total, people, perPerson]);

  const handleSubmit = useCallback(async () => {
    if (!draft) return;
    setIsSubmitting(true);
    setBanner(null);
    try {
      const booking = await bookingsAPI.createGroupBooking({
        bookingType: 'table',
        venueId: draft.venueId ?? null,
        eventId: draft.eventId ?? null,
        tableId: draft.tableId,
        tableName: draft.tableName,
        tablePrice: draft.tablePrice,
        guestCount: people,
        bookingDate: draft.bookingDate,
        ticketQuantity: draft.ticketQuantity || undefined,
        ticketTotal: draft.ticketTotal || undefined,
        splitCount: people,
      });

      if (!booking?.id) throw new Error('The server did not return a booking reference.');
      addBooking(booking);
      navigation.replace('BookingConfirmation', { bookingId: booking.id });
    } catch (err: any) {
      // Nothing was charged — the reservation simply was not created — so this is
      // an inline banner, not a red cinematic. The user stays put and can retry.
      setBanner(err?.response?.data?.message || err?.message || "We couldn't hold this table. Please try again.");
      setIsSubmitting(false);
    }
  }, [draft, people, addBooking, navigation]);

  if (!draft) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safe}>
          <Header navigation={navigation} />
          <View style={styles.blockedWrap}>
            <View style={styles.blockedIcon}>
              <Icon name="triangle-exclamation" size={26} color={colors.warning} />
            </View>
            <Text style={styles.blockedTitle}>Can't split this booking</Text>
            <Text style={styles.blockedText}>
              This link is missing the table details needed to hold a reservation. Go back and pick a table again.
            </Text>
            <GoldButton title="Go Back" onPress={() => navigation.goBack()} variant="secondary" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const where = draft.eventLabel ?? draft.venueName ?? 'Venue to be confirmed';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <Header navigation={navigation} canGoBack={!isSubmitting} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Split the Table</Text>
          <Text style={styles.pageSubtitle}>
            Hold it now, settle up together. Everyone pays their share separately.
          </Text>

          {banner && (
            <View style={styles.banner}>
              <Icon name="circle-exclamation" size={14} color="#F87171" />
              <Text style={styles.bannerText}>{banner}</Text>
            </View>
          )}

          <View style={styles.card}>
            {[
              { label: draft.eventId ? 'Event' : 'Venue', value: where },
              { label: 'Table', value: draft.tableName },
              { label: 'Date', value: dateLabel(draft.bookingDate) },
              ...(draft.ticketQuantity > 0
                ? [{ label: `Tickets (${draft.ticketQuantity})`, value: `₦${formatNaira(draft.ticketTotal)}` }]
                : []),
              { label: 'Table minimum', value: `₦${formatNaira(draft.tablePrice)}` },
              { label: 'Service charge', value: `₦${formatNaira(SERVICE_CHARGE)}` },
            ].map((row, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Total for the table</Text>
              <Text style={styles.rowHighlight}>₦{formatNaira(total)}</Text>
            </View>
          </View>

          <View style={styles.splitCard}>
            <Text style={styles.splitLabel}>How many are splitting?</Text>
            <Text style={styles.splitHint}>Up to {draft.maxGuests} guests at this table</Text>
            <View style={styles.stepperRow}>
              <Stepper
                value={people}
                min={2}
                max={draft.maxGuests}
                onChange={(v) => setPeople(Math.min(Math.max(2, v), draft.maxGuests))}
              />
            </View>

            <View style={styles.perPersonWrap}>
              <Text style={styles.perPersonLabel}>Each person pays about</Text>
              <Text style={styles.perPersonValue}>₦{formatNaira(perPerson)}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.shareRow} onPress={handleShare} activeOpacity={0.8}>
            <Icon name="share-nodes" size={14} color={colors.goldEnd} />
            <Text style={styles.shareText}>Send the split to your group</Text>
          </TouchableOpacity>

          {/* States exactly what it does. There is no contribution endpoint and no
              deep link, so friends cannot pay inside the app — the copy must not
              imply they can. */}
          <Text style={styles.honestNote}>
            This holds the table under your name and marks it as awaiting group payment.
            Your friends settle their share with you directly — in-app contributions are
            not available yet. You can settle the full amount yourself at any time from
            the booking.
          </Text>
        </ScrollView>

        <View style={styles.bottomCta}>
          <GoldButton
            title={`Hold Table for ${people} · ₦${formatNaira(total)}`}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          />
          <TouchableOpacity style={styles.soloLink} onPress={() => navigation.goBack()} disabled={isSubmitting}>
            <Text style={styles.soloText}>Pay for it myself instead</Text>
          </TouchableOpacity>
        </View>
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
    <Text style={styles.headerTitle}>Group Booking</Text>
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
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28 },
  pageTitle: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 26, color: colors.textPrimary, marginBottom: 6 },
  pageSubtitle: {
    fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textSecondary,
    lineHeight: 20, marginBottom: 20,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 20, padding: 20, marginBottom: 16,
    ...shadows.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rowLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textMuted, flex: 1 },
  rowValue: {
    fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.textPrimary,
    textAlign: 'right', marginLeft: 12, flexShrink: 1,
  },
  rowHighlight: { color: colors.goldEnd, fontFamily: 'Inter-Bold', fontSize: 17, textAlign: 'right' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 14 },
  splitCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 20, padding: 20, marginBottom: 16,
  },
  splitLabel: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
  splitHint: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted, marginBottom: 16 },
  stepperRow: { alignItems: 'center', marginBottom: 18 },
  perPersonWrap: {
    backgroundColor: 'rgba(201,151,42,0.10)',
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    alignItems: 'center', gap: 4,
  },
  perPersonLabel: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted },
  perPersonValue: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 24, color: colors.goldEnd },
  shareRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 14, paddingVertical: 13, marginBottom: 16,
    backgroundColor: colors.cardBg,
  },
  shareText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.goldEnd },
  honestNote: {
    fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted,
    lineHeight: 18, paddingHorizontal: 4,
  },
  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(248,113,113,0.10)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.30)',
    borderRadius: 14, padding: 14, marginBottom: 16,
  },
  bannerText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: '#FCA5A5', lineHeight: 18 },
  bottomCta: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16 },
  soloLink: { alignItems: 'center', marginTop: 14 },
  soloText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textMuted },
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
});
