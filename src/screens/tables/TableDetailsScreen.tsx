/**
 * Route: TableDetails
 * Params: { bookingId }
 * GET /tables/:id
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import StarlightBackground from '../../components/StarlightBackground';
import { tablesAPI } from '../../services/api';
import type { BackendBooking } from '../../services/api';

const STATUS_COLOR: Record<string, string> = {
  INITIATED: '#888', PENDING_PAYMENT: '#f5dd4b', CONFIRMED: '#00C851',
  CHECKED_IN: '#00bcd4', ACTIVE: '#00bcd4', COMPLETED: '#555',
  CANCELLED: '#ff4444', EXPIRED: '#ff6b35',
};
const STATUS_ICON: Record<string, any> = {
  INITIATED: 'time-outline', PENDING_PAYMENT: 'card-outline', CONFIRMED: 'checkmark-circle',
  CHECKED_IN: 'enter-outline', ACTIVE: 'radio-button-on', COMPLETED: 'checkmark-done',
  CANCELLED: 'close-circle', EXPIRED: 'alert-circle-outline',
};

function DetailRow({ icon, label, value, highlight }: {
  icon: any; label: string; value: string; highlight?: boolean;
}) {
  return (
    <View style={dr.row}>
      <View style={dr.left}>
        <Ionicons name={icon} size={16} color="#888" style={{ marginRight: 10 }} />
        <Text style={dr.label}>{label}</Text>
      </View>
      <Text style={[dr.value, highlight && { color: '#f5dd4b', fontWeight: 'bold', fontSize: 16 }]}>
        {value}
      </Text>
    </View>
  );
}
const dr = StyleSheet.create({
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  left:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  label: { color: '#888', fontSize: 14 },
  value: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
});

export default function TableDetailsScreen({ route, navigation }: any) {
  const { bookingId } = route.params || {};
  const [booking, setBooking] = useState<BackendBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!bookingId) { setError(true); setLoading(false); return; }
    tablesAPI.getBooking(bookingId)
      .then(setBooking)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });

  if (loading) return (
    <View style={s.container}><StarlightBackground />
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <ActivityIndicator size="large" color="#f5dd4b" style={{ marginTop: 140 }} />
    </View>
  );

  if (error || !booking) return (
    <View style={s.container}><StarlightBackground />
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
      <View style={s.errorWrap}>
        <Ionicons name="restaurant-outline" size={64} color="#333" />
        <Text style={s.errorText}>Booking not found</Text>
        <TouchableOpacity style={s.errorBtn} onPress={() => navigation.goBack()}>
          <Text style={s.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const statusColor = STATUS_COLOR[booking.status] || '#888';
  const statusIcon  = STATUS_ICON[booking.status]  || 'time-outline';
  const tableName   = booking.metadata?.tableNumber || booking.metadata?.tableName;
  const venueName   = booking.metadata?.venueName;
  const venueId     = booking.metadata?.venueId;
  const bookingDate = booking.metadata?.bookingDate;
  const canOrder    = ['CONFIRMED','CHECKED_IN','ACTIVE'].includes(booking.status);

  return (
    <View style={s.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />
      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <LinearGradient colors={['#1a1500','#2a2000']} style={s.heroIcon}
            start={{ x:0,y:0 }} end={{ x:1,y:1 }}>
            <Ionicons name="restaurant" size={44} color="#f5dd4b" />
          </LinearGradient>
          <Text style={s.heroTitle}>{tableName || 'Table Booking'}</Text>
          {venueName && <Text style={s.heroVenue}>{venueName}</Text>}
          <View style={[s.statusPill, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name={statusIcon} size={14} color={statusColor} />
            <Text style={[s.statusText, { color: statusColor }]}>
              {booking.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <View style={s.detailCard}>
          {bookingDate && <DetailRow icon="calendar"           label="Date"    value={formatDate(bookingDate)} />}
          {tableName   && <DetailRow icon="restaurant-outline" label="Table"   value={tableName} />}
          {venueName   && <DetailRow icon="location-outline"   label="Venue"   value={venueName} />}
          <DetailRow icon="people-outline" label="Guests"
            value={`${booking.guestCount} guest${booking.guestCount !== 1 ? 's' : ''}`} />
          <DetailRow icon="cash-outline"   label="Total"
            value={`₦${booking.totalAmount?.toLocaleString()}`} highlight />
          <DetailRow icon="card-outline"   label="Payment"
            value={booking.paymentStatus?.replace(/_/g, ' ')} />
          <DetailRow icon="receipt-outline" label="Booking ID"
            value={booking.id?.slice(0,16) + '...'} />
          <DetailRow icon="time-outline"   label="Booked On"
            value={formatDate(booking.createdAt)} />
        </View>

        {booking.status === 'PENDING_PAYMENT' && (
          <TouchableOpacity style={s.payBtn}
            onPress={() => navigation.navigate('Payment', {
              bookingId: booking.id, totalAmount: booking.totalAmount, bookingType: 'table',
            })} activeOpacity={0.85}>
            <LinearGradient colors={['#f5dd4b','#d4a017']} style={s.payGradient}
              start={{ x:0,y:0 }} end={{ x:1,y:0 }}>
              <Text style={s.payBtnText}>Complete Payment — ₦{booking.totalAmount?.toLocaleString()}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {booking.status === 'CONFIRMED' && (
          <View style={s.confirmedCard}>
            <Ionicons name="checkmark-circle" size={20} color="#00C851" />
            <Text style={s.confirmedText}>
              Your table is confirmed! Please arrive on time and check in at the door.
            </Text>
          </View>
        )}

        {canOrder && venueId && (
          <TouchableOpacity style={s.orderBtn}
            onPress={() => navigation.navigate('Menu', {
              bookingId: booking.id, venueId, venueName, tableNumber: tableName,
            })} activeOpacity={0.85}>
            <Ionicons name="fast-food-outline" size={18} color="#f5dd4b" />
            <Text style={s.orderBtnText}>Order Food & Drinks</Text>
            <Ionicons name="arrow-forward" size={16} color="#f5dd4b" />
          </TouchableOpacity>
        )}

        {venueId && (
          <TouchableOpacity style={s.browseBtn}
            onPress={() => navigation.navigate('TableList', { venueId, venueName })}>
            <Ionicons name="restaurant-outline" size={16} color="#555" />
            <Text style={s.browseBtnText}>Browse other tables at this venue</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#000' },
  backBtn:       { position: 'absolute', top: 54, left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  content:       { paddingTop: 100, paddingHorizontal: 20 },
  hero:          { alignItems: 'center', marginBottom: 28 },
  heroIcon:      { width: 96, height: 96, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  heroTitle:     { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  heroVenue:     { color: '#888', fontSize: 13, marginBottom: 12 },
  statusPill:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  statusText:    { fontSize: 13, fontWeight: '700' },
  detailCard:    { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 20 },
  payBtn:        { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  payGradient:   { paddingVertical: 18, alignItems: 'center' },
  payBtnText:    { color: '#000', fontSize: 16, fontWeight: 'bold' },
  confirmedCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: 'rgba(0,200,81,0.08)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(0,200,81,0.2)', marginBottom: 16 },
  confirmedText: { color: '#00C851', fontSize: 14, flex: 1, lineHeight: 20 },
  orderBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: 'rgba(245,221,75,0.1)', borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(245,221,75,0.3)', marginBottom: 12 },
  orderBtnText:  { color: '#f5dd4b', fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center' },
  browseBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  browseBtnText: { color: '#555', fontSize: 13 },
  errorWrap:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  errorText:     { color: '#888', fontSize: 16, marginTop: 16 },
  errorBtn:      { marginTop: 20, backgroundColor: 'rgba(245,221,75,0.1)', borderWidth: 1, borderColor: '#f5dd4b', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  errorBtnText:  { color: '#f5dd4b', fontSize: 14, fontWeight: '600' },
});