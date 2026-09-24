import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { ticketsAPI } from '../../services/api';
import type { BackendBooking } from '../../services/api';
import { GoldButton } from '../../components/GoldButton';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

// Rewritten from an orphaned draft that referenced a component
// (StarlightBackground) and an icon set (Ionicons) that don't exist / aren't
// used anywhere else in the app. Restyled onto the same LinearGradient +
// theme colors + Inter/PlayfairDisplay pattern every other screen uses, and
// swapped `.toLocaleString()` for `formatNaira` — Hermes doesn't reliably
// comma-format numbers without a native intl build, which is exactly why
// formatNaira exists (see its own comment) and every other money screen uses it.
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  INITIATED:             { color: colors.textMuted, label: 'Processing' },
  PENDING_PAYMENT:       { color: colors.warning,   label: 'Awaiting Payment' },
  PENDING_GROUP_PAYMENT: { color: colors.warning,   label: 'Awaiting Payment' },
  CONFIRMED:             { color: colors.success,   label: 'Confirmed' },
  CHECKED_IN:            { color: colors.active,    label: 'Checked In' },
  COMPLETED:             { color: colors.textMuted, label: 'Used' },
  CANCELLED:             { color: colors.error,     label: 'Cancelled' },
  EXPIRED:               { color: colors.error,     label: 'Expired' },
};

export const TicketScreen = ({ route, navigation }: any) => {
  const { ticketId } = route.params || {};
  const [ticket, setTicket] = useState<BackendBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = () => {
    if (!ticketId) {
      setIsLoading(false);
      setHasError(true);
      return;
    }
    setIsLoading(true);
    setHasError(false);
    ticketsAPI.getTicket(ticketId)
      .then(setTicket)
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [ticketId]);

  const handleCancel = () => {
    if (!ticket) return;
    Alert.alert(
      'Cancel Ticket',
      'Are you sure you want to cancel this ticket? Service charge (\u20a6400) is non-refundable.',
      [
        { text: 'Keep Ticket', style: 'cancel' },
        {
          text: 'Cancel Ticket',
          style: 'destructive',
          onPress: async () => {
            try {
              await ticketsAPI.cancelTicket(ticket.id);
              setTicket((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Cancellation failed');
            }
          },
        },
      ],
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // QR payload — encodes the ticket ID for venue scanning.
  const qrPayload = ticket ? JSON.stringify({
    ticketId: ticket.id,
    eventId: ticket.resourceId,
    status: ticket.status,
    guestCount: ticket.guestCount,
  }) : '';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={{ padding: 24, gap: 16, flex: 1, justifyContent: 'center' }}>
          <SkeletonCard height={80} />
          <SkeletonCard height={320} />
        </SafeAreaView>
      </View>
    );
  }

  if (hasError || !ticket) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={{ flex: 1 }}>
          <ErrorState
            title="Couldn't load this ticket"
            subtitle="Something went wrong. Tap to retry."
            onRetry={load}
            fullScreen
          />
        </SafeAreaView>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.INITIATED;
  const isValid = ['CONFIRMED', 'CHECKED_IN'].includes(ticket.status);
  const isCancellable = ['INITIATED', 'PENDING_PAYMENT', 'PENDING_GROUP_PAYMENT', 'CONFIRMED'].includes(ticket.status);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Ticket</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.ticketCard, !isValid && styles.ticketCardInvalid]}>
            <View style={styles.separator}>
              <View style={styles.circleLeft} />
              <View style={styles.dashes} />
              <View style={styles.circleRight} />
            </View>

            <View style={styles.ticketTop}>
              <View style={styles.ticketIconRow}>
                <Icon name="ticket" size={22} color={colors.goldEnd} />
                <Text style={styles.ticketTypeLabel}>EVENT TICKET</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: `${statusCfg.color}20` }]}>
                <Text style={[styles.statusPillText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
              </View>
            </View>

            <View style={styles.ticketDetails}>
              <TicketRow label="Guests" value={`${ticket.guestCount} ${ticket.guestCount === 1 ? 'person' : 'people'}`} />
              <TicketRow label="Booked" value={formatDate(ticket.createdAt)} />
              <TicketRow label="Base Price" value={`\u20a6${formatNaira(ticket.basePrice ?? 0)}`} />
              <TicketRow label="Service Charge" value={`\u20a6${formatNaira(ticket.serviceCharge ?? 0)} (non-refundable)`} />
              <TicketRow label="Total Paid" value={`\u20a6${formatNaira(ticket.totalAmount)}`} highlight />
              <TicketRow label="Payment" value={ticket.paymentStatus ? ticket.paymentStatus.replace(/_/g, ' ') : 'Pending'} />
            </View>

            <View style={styles.separator}>
              <View style={styles.circleLeft} />
              <View style={styles.dashes} />
              <View style={styles.circleRight} />
            </View>

            <View style={styles.qrSection}>
              {isValid ? (
                <>
                  <Text style={styles.qrLabel}>Scan at entrance</Text>
                  <View style={styles.qrContainer}>
                    <QRCode value={qrPayload} size={200} color="#000" backgroundColor="#fff" />
                  </View>
                  <Text style={styles.qrSubtext}>Show this QR code to door staff</Text>
                </>
              ) : (
                <View style={styles.invalidQr}>
                  <Icon name="ban" size={48} color={colors.error} />
                  <Text style={styles.invalidText}>
                    {(ticket.status === 'PENDING_PAYMENT' || ticket.status === 'PENDING_GROUP_PAYMENT')
                      ? 'Complete payment to activate this ticket'
                      : `Ticket is ${ticket.status.toLowerCase().replace(/_/g, ' ')}`}
                  </Text>
                  {(ticket.status === 'PENDING_PAYMENT' || ticket.status === 'PENDING_GROUP_PAYMENT') && (
                    <GoldButton
                      title="Pay Now"
                      onPress={() => navigation.navigate('Payment', {
                        bookingId: ticket.id,
                        totalAmount: ticket.totalAmount,
                        bookingType: 'ticket',
                      })}
                      style={{ marginTop: 16, width: 180 }}
                    />
                  )}
                </View>
              )}

              <Text style={styles.refLabel}>Booking Reference</Text>
              <Text style={styles.refValue}>{ticket.id.toUpperCase().slice(0, 16)}</Text>
            </View>
          </View>

          {isCancellable && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Icon name="circle-xmark" size={15} color={colors.error} />
              <Text style={styles.cancelButtonText}>Cancel Ticket</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const TicketRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={rowStyles.row}>
    <Text style={rowStyles.label}>{label}</Text>
    <Text style={[rowStyles.value, highlight && rowStyles.valueHighlight]}>{value}</Text>
  </View>
);

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 7 },
  label: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textMuted },
  value: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.textPrimary, flex: 1, textAlign: 'right' },
  valueHighlight: { color: colors.goldEnd, fontFamily: 'Inter-Bold', fontSize: 14 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 19, color: colors.textPrimary },
  content: { paddingHorizontal: 24, paddingBottom: 20 },
  ticketCard: {
    backgroundColor: colors.cardBg, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.borderGold,
    ...shadows.card,
  },
  ticketCardInvalid: { borderColor: 'rgba(239,68,68,0.25)', opacity: 0.9 },
  separator: { flexDirection: 'row', alignItems: 'center' },
  circleLeft: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bgPrimary, marginLeft: -12 },
  dashes: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  circleRight: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.bgPrimary, marginRight: -12 },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  ticketIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ticketTypeLabel: { fontFamily: 'Inter-Bold', fontSize: 11, color: colors.textMuted, letterSpacing: 0.5 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPillText: { fontFamily: 'Inter-Bold', fontSize: 11 },
  ticketDetails: { paddingHorizontal: 20, paddingBottom: 8 },
  qrSection: { padding: 24, alignItems: 'center' },
  qrLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  qrContainer: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  qrSubtext: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted, marginBottom: 20 },
  invalidQr: { alignItems: 'center', paddingVertical: 20 },
  invalidText: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textMuted, marginTop: 12, textAlign: 'center' },
  refLabel: { fontFamily: 'Inter-Regular', fontSize: 10, color: colors.textMuted, marginBottom: 4 },
  refValue: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted, letterSpacing: 0.5 },
  cancelButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 20, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', borderRadius: 16,
  },
  cancelButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.error },
});