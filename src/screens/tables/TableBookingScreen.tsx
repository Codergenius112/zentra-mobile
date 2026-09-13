/**
 * Route: TableBooking
 * Params: { tableId, tableName, category, capacity, price, venueId, venueName, description, features }
 * POST /tables → Payment
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StarlightBackground from '../../components/StarlightBackground';
import { useStore } from '../../store/useStore';
import { tablesAPI, SERVICE_CHARGE } from '../../services/api';

const CATEGORY_COLOR: Record<string, string> = {
  standard: '#888', vip: '#f5dd4b', vvip: '#ff6b35', booth: '#00bcd4', private: '#e91e8c',
};
const CATEGORY_LABEL: Record<string, string> = {
  standard: 'Standard', vip: 'VIP', vvip: 'VVIP', booth: 'Booth', private: 'Private',
};

export default function TableBookingScreen({ route, navigation }: any) {
  const { tableId, tableName, category, capacity, price, venueId, venueName, description, features } = route.params || {};
  const addBooking = useStore(s => s.addBooking);

  const [bookingDate, setBookingDate] = useState('');
  const [guestCount, setGuestCount]   = useState('2');
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [loading, setLoading]         = useState(false);

  const totalAmount = (Number(price) || 0) + SERVICE_CHARGE;
  const catColor    = CATEGORY_COLOR[category] || '#888';
  const guests      = Number(guestCount) || 0;

  const parseDate = (s: string): Date | null => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const isValidDate   = bookingDate.length === 10 && !!parseDate(bookingDate);
  const isValidGuests = guests >= 1 && guests <= (capacity || 99);

  const handleBook = async () => {
    if (!isValidDate) { Alert.alert('Invalid Date', 'Enter date as YYYY-MM-DD.'); return; }
    const d = parseDate(bookingDate)!;
    if (d < new Date(new Date().setHours(0,0,0,0))) {
      Alert.alert('Invalid Date', 'Booking date cannot be in the past.'); return;
    }
    if (!isValidGuests) { Alert.alert('Invalid Guests', `Enter 1–${capacity} guests.`); return; }

    if (isGroupBooking) {
      navigation.navigate('GroupBooking', {
        bookingType: 'table',
        selectedItem: { id: tableId, venueId, name: tableName, category, capacity, price: Number(price), description, features },
        quantity: 1,
        totalAmount: totalAmount,
        basePrice: Number(price),
        tableBookingDetails: { bookingDate: d.toISOString(), guestCount: guests, tableNumber: tableName, venueName },
      });
      return;
    }

    try {
      setLoading(true);
      const booking = await tablesAPI.bookTable({
        venueId,
        tableId,
        tableNumber: tableName,
        venueName,
        guestCount: guests,
        bookingDate: d.toISOString(),
        price: Number(price),
      });
      addBooking(booking);
      navigation.navigate('Payment', {
        bookingId:   booking.id,
        totalAmount: booking.totalAmount,
        bookingType: 'table',
      });
    } catch (err: any) {
      Alert.alert('Booking Failed', err?.response?.data?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <StarlightBackground />
      <StatusBar barStyle="light-content" />

      <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Table card */}
        <LinearGradient
          colors={category === 'vvip' ? ['#2a1500','#1a0d00']
            : category === 'vip'   ? ['#1a1500','#2a2000']
            : category === 'booth' ? ['#001a1f','#002a30']
            : ['#111','#1a1a1a']}
          style={s.tableCard} start={{ x:0,y:0 }} end={{ x:1,y:1 }}>
          <View style={[s.tableIcon, { backgroundColor: catColor + '20', borderColor: catColor + '40' }]}>
            <Ionicons name="restaurant" size={28} color={catColor} />
          </View>
          <View style={s.tableCardRight}>
            <View style={s.tableCardTopRow}>
              <Text style={s.tableCardName} numberOfLines={1}>{tableName}</Text>
              <View style={[s.catChip, { backgroundColor: catColor + '20' }]}>
                <Text style={[s.catChipText, { color: catColor }]}>{CATEGORY_LABEL[category] || category}</Text>
              </View>
            </View>
            {venueName   && <Text style={s.tableVenue}>{venueName}</Text>}
            {description && <Text style={s.tableDesc} numberOfLines={2}>{description}</Text>}
            <View style={s.capacityRow}>
              <Ionicons name="people-outline" size={13} color="#888" />
              <Text style={s.capacityText}>Up to {capacity} guests</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Features */}
        {features?.length > 0 && (
          <View style={s.featuresRow}>
            {features.map((f: string, i: number) => (
              <View key={i} style={s.featureChip}>
                <Ionicons name="checkmark-circle" size={13} color="#00C851" />
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.sectionTitle}>Booking Details</Text>

        {/* Date */}
        <View style={s.section}>
          <Text style={s.label}>Date</Text>
          <View style={s.inputWrap}>
            <Ionicons name="calendar-outline" size={20} color="#888" style={s.inputIcon} />
            <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor="#555"
              value={bookingDate} onChangeText={setBookingDate} maxLength={10}
              keyboardType="numbers-and-punctuation" />
          </View>
          {isValidDate && (
            <Text style={s.datePreview}>
              {parseDate(bookingDate)!.toLocaleDateString('en-GB', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          )}
        </View>

        {/* Guests */}
        <View style={s.section}>
          <Text style={s.label}>Number of Guests (max {capacity})</Text>
          <View style={s.guestRow}>
            <TouchableOpacity style={s.guestBtn}
              onPress={() => setGuestCount(String(Math.max(1, guests - 1)))}>
              <Ionicons name="remove" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={s.guestInputWrap}>
              <TextInput style={s.guestInput} value={guestCount}
                onChangeText={v => setGuestCount(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric" maxLength={2} textAlign="center" />
            </View>
            <TouchableOpacity style={s.guestBtn}
              onPress={() => setGuestCount(String(Math.min(capacity, guests + 1)))}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          {guests > capacity && (
            <Text style={s.guestWarn}>Maximum {capacity} guests for this table</Text>
          )}
        </View>

        {/* Group booking */}
        <TouchableOpacity style={s.groupToggle} onPress={() => setIsGroupBooking(!isGroupBooking)} activeOpacity={0.85}>
          <View style={s.groupLeft}>
            <Ionicons name="people" size={22} color="#f5dd4b" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={s.groupTitle}>Group Booking</Text>
              <Text style={s.groupSubtitle}>Split payment with friends</Text>
            </View>
          </View>
          <View style={[s.toggleTrack, isGroupBooking && s.toggleTrackActive]}>
            <View style={[s.toggleCircle, isGroupBooking && s.toggleCircleActive]} />
          </View>
        </TouchableOpacity>

        {/* Price summary */}
        <View style={s.priceCard}>
          <Text style={s.priceTitle}>Price Summary</Text>
          <View style={s.priceRow}>
            <Text style={s.priceLabel}>Table reservation</Text>
            <Text style={s.priceValue}>₦{Number(price).toLocaleString()}</Text>
          </View>
          <View style={s.priceRow}>
            <View>
              <Text style={s.priceLabel}>Service charge</Text>
              <Text style={s.priceNote}>Non-refundable</Text>
            </View>
            <Text style={s.priceValue}>₦{SERVICE_CHARGE.toLocaleString()}</Text>
          </View>
          <View style={s.divider} />
          <View style={s.priceRow}>
            <Text style={[s.priceLabel, { color: '#fff', fontWeight: '700' }]}>Total</Text>
            <Text style={s.priceTotal}>₦{totalAmount.toLocaleString()}</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[s.bookBtn, (!isValidDate || !isValidGuests || loading) && { opacity: 0.5 }]}
          onPress={handleBook} disabled={!isValidDate || !isValidGuests || loading}
          activeOpacity={0.85}>
          <LinearGradient colors={['#f5dd4b','#d4a017']} style={s.bookGradient}
            start={{ x:0,y:0 }} end={{ x:1,y:0 }}>
            {loading
              ? <ActivityIndicator color="#111" />
              : <Text style={s.bookBtnText}>{isGroupBooking ? 'Continue to Group' : `Confirm & Pay ₦${totalAmount.toLocaleString()}`}</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#000' },
  backBtn:        { position: 'absolute', top: 54, left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  content:        { padding: 20, paddingTop: 110 },
  tableCard:      { flexDirection: 'row', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#222', gap: 14, alignItems: 'center' },
  tableIcon:      { width: 64, height: 64, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  tableCardRight: { flex: 1 },
  tableCardTopRow:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tableCardName:  { color: '#fff', fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  catChip:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catChipText:    { fontSize: 11, fontWeight: '700' },
  tableVenue:     { color: '#888', fontSize: 12, marginBottom: 4 },
  tableDesc:      { color: '#666', fontSize: 13, lineHeight: 18, marginBottom: 8 },
  capacityRow:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  capacityText:   { color: '#888', fontSize: 12 },
  featuresRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  featureChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,200,81,0.08)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,200,81,0.2)' },
  featureText:    { color: '#00C851', fontSize: 12 },
  sectionTitle:   { fontSize: 17, fontWeight: '700', color: '#fff', marginBottom: 16 },
  section:        { marginBottom: 20 },
  label:          { color: '#888', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  inputIcon:      { marginRight: 12 },
  input:          { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 16 },
  datePreview:    { color: '#f5dd4b', fontSize: 12, marginTop: 6, marginLeft: 4 },
  guestRow:       { flexDirection: 'row', alignItems: 'center', gap: 16 },
  guestBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  guestInputWrap: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  guestInput:     { color: '#fff', fontSize: 22, fontWeight: 'bold', paddingVertical: 12 },
  guestWarn:      { color: '#ff4444', fontSize: 12, marginTop: 6 },
  priceCard:      { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  groupToggle:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  groupLeft:      { flexDirection: 'row', alignItems: 'center', flex: 1 },
  groupTitle:     { fontSize: 15, fontWeight: '700', color: '#fff' },
  groupSubtitle:  { fontSize: 12, color: '#888', marginTop: 2 },
  toggleTrack:    { width: 46, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.1)', padding: 2, justifyContent: 'center' },
  toggleTrackActive: { backgroundColor: '#f5dd4b' },
  toggleCircle:   { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  toggleCircleActive: { alignSelf: 'flex-end' },
  priceTitle:     { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 16 },
  priceRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  priceLabel:     { color: '#888', fontSize: 14 },
  priceNote:      { color: '#555', fontSize: 11, marginTop: 2 },
  priceValue:     { color: '#fff', fontSize: 14, fontWeight: '600' },
  priceTotal:     { color: '#f5dd4b', fontSize: 20, fontWeight: 'bold' },
  divider:        { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  bookBtn:        { borderRadius: 14, overflow: 'hidden' },
  bookGradient:   { paddingVertical: 18, alignItems: 'center' },
  bookBtnText:    { color: '#000', fontSize: 17, fontWeight: 'bold' },
});