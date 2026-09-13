import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import StarlightBackground from '../../components/StarlightBackground';
import { ticketsAPI } from '../../services/api';
import type { BackendBooking } from '../../services/api';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  INITIATED:       { color: '#888',    label: 'Processing' },
  PENDING_PAYMENT: { color: '#f5dd4b', label: 'Awaiting Payment' },
  CONFIRMED:       { color: '#00C851', label: 'Confirmed ✓' },
  CHECKED_IN:      { color: '#00bcd4', label: 'Checked In' },
  COMPLETED:       { color: '#888',    label: 'Used' },
  CANCELLED:       { color: '#ff4444', label: 'Cancelled' },
  EXPIRED:         { color: '#ff6b35', label: 'Expired' },
};

export default function TicketScreen({ route, navigation }: any) {
  const { ticketId } = route.params || {};
  const [ticket, setTicket] = useState<BackendBooking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ticketId) {
      // GET /tickets/:id
      ticketsAPI.getTicket(ticketId)
        .then(setTicket)
        .catch((err) => {
          console.error('Failed to fetch ticket:', err);
          Alert.alert('Error', 'Failed to load ticket');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [ticketId]);

  const handleCancel = () => {
    if (!ticket) return;
    Alert.alert(
      'Cancel Ticket',
      'Are you sure you want to cancel this ticket? Service charge (₦400) is non-refundable.',
      [
        { text: 'Keep Ticket', style: 'cancel' },
        {
          text: 'Cancel Ticket',
          style: 'destructive',
          onPress: async () => {
            try {
              // PATCH /tickets/:id/cancel
              await ticketsAPI.cancelTicket(ticket.id);
              setTicket((prev) => prev ? { ...prev, status: 'CANCELLED' } : null);
              Alert.alert('Cancelled', 'Your ticket has been cancelled.');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Cancellation failed');
            }
          },
        },
      ],
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

  // QR code payload — encodes ticket ID for venue scanning
  const qrPayload = ticket ? JSON.stringify({
    ticketId: ticket.id,
    eventId: ticket.resourceId,
    status: ticket.status,
    guestCount: ticket.guestCount,
  }) : '';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StarlightBackground />
        <ActivityIndicator size="large" color="#f5dd4b" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.loadingContainer}>
        <StarlightBackground />
        <Ionicons name="ticket-outline" size={64} color="#444" />
        <Text style={styles.notFoundText}>Ticket not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusCfg = STATUS_CONFIG[ticket.status] || STATUS_CONFIG['INITIATED'];
  const isValid = ['CONFIRMED', 'CHECKED_IN'].includes(ticket.status);

  return (
    <View style={styles.container}>
      <StarlightBackground />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Ticket</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Ticket card */}
        <View style={[styles.ticketCard, !isValid && styles.ticketCardInvalid]}>
          {/* Dashed separator */}
          <View style={styles.separator}>
            <View style={styles.circleLeft} />
            <View style={styles.dashes} />
            <View style={styles.circleRight} />
          </View>

          {/* Top section */}
          <View style={styles.ticketTop}>
            <View style={styles.ticketIconRow}>
              <Ionicons name="ticket" size={32} color="#f5dd4b" />
              <Text style={styles.ticketTypeLabel}>EVENT TICKET</Text>
            </View>

            <View style={[styles.statusPill, { backgroundColor: statusCfg.color + '20' }]}>
              <Text style={[styles.statusPillText, { color: statusCfg.color }]}>
                {statusCfg.label}
              </Text>
            </View>
          </View>

          {/* Ticket details */}
          <View style={styles.ticketDetails}>
            <TicketRow label="Guests" value={`${ticket.guestCount} ${ticket.guestCount === 1 ? 'person' : 'people'}`} />
            <TicketRow label="Booked" value={formatDate(ticket.createdAt)} />
            <TicketRow label="Base Price" value={`₦${ticket.basePrice?.toLocaleString()}`} />
            <TicketRow label="Service Charge" value={`₦${ticket.serviceCharge?.toLocaleString()} (non-refundable)`} />
            <TicketRow label="Total Paid" value={`₦${ticket.totalAmount?.toLocaleString()}`} highlight />
            <TicketRow label="Payment" value={ticket.paymentStatus?.replace(/_/g, ' ')} />
          </View>

          {/* Separator */}
          <View style={styles.separator}>
            <View style={styles.circleLeft} />
            <View style={styles.dashes} />
            <View style={styles.circleRight} />
          </View>

          {/* QR code section */}
          <View style={styles.qrSection}>
            {isValid ? (
              <>
                <Text style={styles.qrLabel}>Scan at entrance</Text>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={qrPayload}
                    size={200}
                    color="#000"
                    backgroundColor="#fff"
                  />
                </View>
                <Text style={styles.qrSubtext}>
                  Show this QR code to door staff
                </Text>
              </>
            ) : (
              <View style={styles.invalidQr}>
                <Ionicons name="ban" size={64} color="#ff4444" />
                <Text style={styles.invalidText}>
                  {ticket.status === 'PENDING_PAYMENT'
                    ? 'Complete payment to activate ticket'
                    : `Ticket is ${ticket.status.toLowerCase()}`}
                </Text>
                {ticket.status === 'PENDING_PAYMENT' && (
                  <TouchableOpacity style={styles.payNowBtn}
                    onPress={() => navigation.navigate('Payment', {
                      bookingId: ticket.id,
                      totalAmount: ticket.totalAmount,
                      bookingType: 'ticket',
                    })}>
                    <Text style={styles.payNowText}>Pay Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Booking reference */}
            <Text style={styles.refLabel}>Booking Reference</Text>
            <Text style={styles.refValue}>{ticket.id?.toUpperCase().slice(0, 16)}</Text>
          </View>
        </View>

        {/* Cancel button for cancellable states */}
        {['INITIATED', 'PENDING_PAYMENT', 'CONFIRMED'].includes(ticket.status) && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Ionicons name="close-circle-outline" size={18} color="#ff4444" />
            <Text style={styles.cancelButtonText}>Cancel Ticket</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function TicketRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, highlight && { color: '#f5dd4b', fontWeight: 'bold' }]}>
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingVertical: 8,
  },
  label: { color: '#888', fontSize: 13 },
  value: { color: '#fff', fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: {
    flex: 1, backgroundColor: '#000',
    justifyContent: 'center', alignItems: 'center',
  },
  notFoundText: { color: '#888', fontSize: 16, marginTop: 16 },
  backBtn: {
    marginTop: 24, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: '#f5dd4b', borderRadius: 8,
  },
  backBtnText: { color: '#000', fontWeight: 'bold' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 54, paddingBottom: 20,
  },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { paddingHorizontal: 20, paddingBottom: 20 },
  ticketCard: {
    backgroundColor: '#111', borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(245,221,75,0.2)',
  },
  ticketCardInvalid: { borderColor: 'rgba(255,68,68,0.2)', opacity: 0.85 },
  separator: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 0, marginVertical: 0,
  },
  circleLeft: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#000', marginLeft: -12,
  },
  dashes: { flex: 1, height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#333' },
  circleRight: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#000', marginRight: -12,
  },
  ticketTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20,
  },
  ticketIconRow: { flexDirection: 'row', alignItems: 'center' },
  ticketTypeLabel: { color: '#888', fontSize: 12, fontWeight: '700', marginLeft: 10 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  ticketDetails: { paddingHorizontal: 20, paddingBottom: 8 },
  qrSection: { padding: 24, alignItems: 'center' },
  qrLabel: { color: '#888', fontSize: 13, marginBottom: 16 },
  qrContainer: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
  },
  qrSubtext: { color: '#666', fontSize: 12, marginBottom: 20 },
  invalidQr: { alignItems: 'center', paddingVertical: 20 },
  invalidText: { color: '#888', fontSize: 14, marginTop: 12, textAlign: 'center' },
  payNowBtn: {
    marginTop: 16, backgroundColor: '#f5dd4b',
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8,
  },
  payNowText: { color: '#000', fontWeight: 'bold' },
  refLabel: { color: '#555', fontSize: 11, marginBottom: 4 },
  refValue: { color: '#444', fontSize: 11, fontFamily: 'monospace' },
  cancelButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 20, paddingVertical: 14,
    borderWidth: 1, borderColor: '#ff4444', borderRadius: 12,
  },
  cancelButtonText: { color: '#ff4444', fontSize: 15, fontWeight: '600', marginLeft: 8 },
});