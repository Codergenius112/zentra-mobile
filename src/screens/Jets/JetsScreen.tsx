import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground,
  Modal, TextInput, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { jetsAPI, JetListing } from '../../services/api';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { GoldButton } from '../../components/GoldButton';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

const CATEGORIES = [
  { label: 'All Aircraft', value: 'ALL' },
  { label: 'Heavy Jets', value: 'HEAVY_JET' },
  { label: 'Midsize', value: 'MIDSIZE_JET' },
  { label: 'Light Jets', value: 'LIGHT_JET' },
  { label: 'Helicopters', value: 'HELICOPTER' },
];

const AIRPORTS = [
  { code: 'LOS', name: 'Lagos (Murtala Muhammed MMA)' },
  { code: 'ABV', name: 'Abuja (Nnamdi Azikiwe Intl)' },
  { code: 'PHC', name: 'Port Harcourt (Omagwa Intl)' },
  { code: 'KAN', name: 'Kano (Mallam Aminu Kano)' },
  { code: 'ENU', name: 'Enugu (Akanu Ibiam Intl)' },
  { code: 'VIH', name: 'Lagos Island (Victoria Island Helipad)' },
  { code: 'ACC', name: 'Accra (Kotoka International)' },
  { code: 'LTN', name: 'London (London Luton Airport)' },
  { code: 'DXB', name: 'Dubai (Al Maktoum International)' },
];

// Fallback luxury fleet if backend has zero listings
const FALLBACK_FLEET: JetListing[] = [
  {
    id: 'mock-g650',
    name: 'Gulfstream G650ER',
    model: 'G650ER',
    manufacturer: 'Gulfstream',
    category: 'HEAVY_JET',
    tailNumber: '5N-ZEN',
    capacity: 14,
    rangeNauticalMiles: 7500,
    cruisingSpeedKnots: 516,
    pricePerHour: 4800000,
    cautionFee: 500000,
    cautionFeeRefundable: true,
    baseAirport: 'LOS - Murtala Muhammed International',
    city: 'Lagos',
    country: 'Nigeria',
    description: 'Ultra-long range luxury jet with bedroom suite, high-speed Ka-band Wi-Fi and dedicated cabin hostess.',
    features: ['Ka-Band Wi-Fi', 'Private Stateroom', 'Full Galley', 'Enclosed Lavatory'],
    amenities: ['Dom Pérignon Service', 'Gourmet Catering', 'VIP Ground Transfer'],
    images: ['https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80'],
    isActive: true,
  },
  {
    id: 'mock-challenger',
    name: 'Bombardier Challenger 350',
    model: 'Challenger 350',
    manufacturer: 'Bombardier',
    category: 'MIDSIZE_JET',
    tailNumber: '5N-ABV',
    capacity: 9,
    rangeNauticalMiles: 3200,
    cruisingSpeedKnots: 470,
    pricePerHour: 3200000,
    cautionFee: 350000,
    cautionFeeRefundable: true,
    baseAirport: 'ABV - Nnamdi Azikiwe International',
    city: 'Abuja',
    country: 'Nigeria',
    description: 'Super midsize jet combining widebody cabin space with high-speed performance across West Africa and Europe.',
    features: ['Satellite Wi-Fi', 'Flat Floor Cabin', 'Dual Club Seating'],
    amenities: ['Fine Wines', 'Espresso Bar', 'Noise-Cancelling Headsets'],
    images: ['https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1200&q=80'],
    isActive: true,
  },
  {
    id: 'mock-bell429',
    name: 'Bell 429 GlobalRanger',
    model: 'Bell 429',
    manufacturer: 'Bell Helicopter',
    category: 'HELICOPTER',
    tailNumber: '5N-HLI',
    capacity: 6,
    rangeNauticalMiles: 411,
    cruisingSpeedKnots: 155,
    pricePerHour: 1800000,
    cautionFee: 200000,
    cautionFeeRefundable: true,
    baseAirport: 'Victoria Island Heliport',
    city: 'Lagos',
    country: 'Nigeria',
    description: 'Executive twin-engine helicopter for rapid VIP airport and intercity transfers avoiding city traffic.',
    features: ['Twin Turbines', 'Air Conditioning', 'Panoramic Windows'],
    amenities: ['Leather Club Seating', 'VIP Meet & Greet'],
    images: ['https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=80'],
    isActive: true,
  },
];

export const JetsScreen = ({ navigation }: any) => {
  const [jets, setJets] = useState<JetListing[]>([]);
  const [category, setCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Booking Modal State
  const [selectedJet, setSelectedJet] = useState<JetListing | null>(null);
  const [tripType, setTripType] = useState<'ONE_WAY' | 'ROUND_TRIP'>('ONE_WAY');
  const [departureAirport, setDepartureAirport] = useState('LOS - Murtala Muhammed MMA');
  const [arrivalAirport, setArrivalAirport] = useState('ABV - Nnamdi Azikiwe Intl');
  const [departureDate, setDepartureDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [departureTime, setDepartureTime] = useState('11:00');
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  });
  const [passengerCount, setPassengerCount] = useState('2');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await jetsAPI.getListings({
        category: category === 'ALL' ? undefined : category,
      });
      const list = res.listings && res.listings.length > 0 ? res.listings : FALLBACK_FLEET;
      setJets(list);
    } catch (err) {
      console.warn('Failed to load live jets, using fallback fleet', err);
      setJets(FALLBACK_FLEET);
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenBooking = (jet: JetListing) => {
    setSelectedJet(jet);
  };

  const handleConfirmBooking = async () => {
    if (!selectedJet) return;
    const pax = Number(passengerCount) || 1;
    if (pax > selectedJet.capacity) {
      Alert.alert('Capacity Exceeded', `Maximum passengers for this aircraft is ${selectedJet.capacity}.`);
      return;
    }
    if (!departureDate) {
      Alert.alert('Missing Date', 'Please enter a flight departure date.');
      return;
    }

    setBookingLoading(true);
    try {
      const payload = {
        jetId: selectedJet.id,
        departureAirport,
        arrivalAirport,
        departureDate,
        departureTime,
        returnDate: tripType === 'ROUND_TRIP' ? returnDate : undefined,
        tripType,
        passengerCount: pax,
        price: Number(selectedJet.pricePerHour),
        specialRequests,
        contactName,
        contactPhone,
      };

      const booking = await jetsAPI.bookJet(payload);
      setSelectedJet(null);

      Alert.alert(
        'Charter Booking Created! ✈️',
        `Your reservation for ${selectedJet.name} has been initiated.\n\nBooking ID: #${booking?.id?.slice(0, 8) || 'CONFIRMED'}\nDeparture: ${departureDate} (${departureAirport} → ${arrivalAirport})`,
        [
          {
            text: 'View in My Bookings',
            onPress: () => navigation.navigate('BookingsStack', { screen: 'MyBookings' }),
          },
          { text: 'Done', style: 'cancel' },
        ],
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unable to complete jet charter booking';
      Alert.alert('Booking Error', msg);
    } finally {
      setBookingLoading(false);
    }
  };

  const filteredJets = category === 'ALL'
    ? jets
    : jets.filter((j) => j.category?.toUpperCase() === category);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Icon name="plane" size={16} color={colors.goldEnd} />
            <Text style={styles.title}>Private Jets</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Cars / Jets Toggle */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('Rides')}>
            <Text style={styles.tabText}>Cars</Text>
          </TouchableOpacity>
          <View style={styles.tabActive}>
            <Text style={styles.tabActiveText}>Jets</Text>
          </View>
        </View>

        {/* Categories Bar */}
        <View style={styles.catScrollWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setCategory(cat.value)}
                style={[styles.catPill, category === cat.value && styles.catPillActive]}
              >
                <Text style={[styles.catPillText, category === cat.value && styles.catPillTextActive]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Body */}
        {isLoading ? (
          <View style={{ paddingHorizontal: 24, gap: 14 }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} height={220} />)}
          </View>
        ) : hasError && filteredJets.length === 0 ? (
          <ErrorState
            title="Couldn't load aircraft fleet"
            subtitle="Something went wrong. Tap to retry."
            onRetry={load}
            fullScreen
          />
        ) : filteredJets.length === 0 ? (
          <EmptyState icon="plane" title="No aircraft found" subtitle="No jets match this category at the moment." />
        ) : (
          <FlatList
            data={filteredJets}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <ImageBackground
                  source={{ uri: item.images?.[0] || 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80' }}
                  style={styles.cardImage}
                  imageStyle={styles.cardImageInner}
                >
                  <LinearGradient colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.badgeRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{item.category?.replace('_', ' ')}</Text>
                    </View>
                    <View style={styles.tailBadge}>
                      <Text style={styles.tailBadgeText}>{item.tailNumber}</Text>
                    </View>
                  </View>

                  <View style={styles.cardImageFooter}>
                    <Text style={styles.jetName}>{item.name}</Text>
                    <Text style={styles.jetModel}>{item.manufacturer} • {item.model}</Text>
                  </View>
                </ImageBackground>

                <View style={styles.cardContent}>
                  {/* Specs Row */}
                  <View style={styles.specsRow}>
                    <View style={styles.specItem}>
                      <Icon name="users" size={12} color={colors.goldEnd} />
                      <Text style={styles.specText}>{item.capacity} Seats</Text>
                    </View>
                    <View style={styles.specDivider} />
                    <View style={styles.specItem}>
                      <Icon name="gauge-high" size={12} color={colors.goldEnd} />
                      <Text style={styles.specText}>{item.cruisingSpeedKnots ?? 450} kts</Text>
                    </View>
                    <View style={styles.specDivider} />
                    <View style={styles.specItem}>
                      <Icon name="route" size={12} color={colors.goldEnd} />
                      <Text style={styles.specText}>{item.rangeNauticalMiles ?? 3000} nm</Text>
                    </View>
                  </View>

                  <View style={styles.locationRow}>
                    <Icon name="location-dot" size={11} color={colors.textMuted} />
                    <Text style={styles.locationText} numberOfLines={1}>{item.baseAirport}</Text>
                  </View>

                  {/* Pricing and Book Button */}
                  <View style={styles.priceRow}>
                    <View>
                      <Text style={styles.priceLabel}>Charter Rate</Text>
                      <Text style={styles.priceValue}>{formatNaira(item.pricePerHour)}</Text>
                      <Text style={styles.priceUnit}>per flight hour</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.bookBtn}
                      onPress={() => handleOpenBooking(item)}
                    >
                      <LinearGradient colors={[colors.goldStart, colors.goldEnd]} style={styles.bookBtnGrad}>
                        <Text style={styles.bookBtnText}>Book Charter</Text>
                        <Icon name="chevron-right" size={11} color="#0A0A0F" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        )}

        {/* BOOKING MODAL */}
        <Modal
          visible={!!selectedJet}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedJet(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Book Private Charter</Text>
                  <Text style={styles.modalSubtitle}>{selectedJet?.name} ({selectedJet?.tailNumber})</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedJet(null)} style={styles.closeBtn}>
                  <Icon name="xmark" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {/* Trip Type Toggle */}
                <View style={styles.tripTypeRow}>
                  <TouchableOpacity
                    onPress={() => setTripType('ONE_WAY')}
                    style={[styles.tripTypeBtn, tripType === 'ONE_WAY' && styles.tripTypeBtnActive]}
                  >
                    <Text style={[styles.tripTypeText, tripType === 'ONE_WAY' && styles.tripTypeTextActive]}>
                      One Way
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setTripType('ROUND_TRIP')}
                    style={[styles.tripTypeBtn, tripType === 'ROUND_TRIP' && styles.tripTypeBtnActive]}
                  >
                    <Text style={[styles.tripTypeText, tripType === 'ROUND_TRIP' && styles.tripTypeTextActive]}>
                      Round Trip
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Departure Airport */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Departure Airport</Text>
                  <View style={styles.inputWrap}>
                    <Icon name="plane-departure" size={13} color={colors.goldEnd} />
                    <TextInput
                      style={styles.input}
                      value={departureAirport}
                      onChangeText={setDepartureAirport}
                      placeholder="e.g. LOS - Murtala Muhammed MMA"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                {/* Arrival Airport */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Arrival Airport</Text>
                  <View style={styles.inputWrap}>
                    <Icon name="plane-arrival" size={13} color={colors.goldEnd} />
                    <TextInput
                      style={styles.input}
                      value={arrivalAirport}
                      onChangeText={setArrivalAirport}
                      placeholder="e.g. ABV - Nnamdi Azikiwe Intl"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                {/* Date & Time */}
                <View style={styles.rowTwo}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>Departure Date</Text>
                    <View style={styles.inputWrap}>
                      <Icon name="calendar-days" size={13} color={colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        value={departureDate}
                        onChangeText={setDepartureDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                  <View style={[styles.formGroup, { width: 110 }]}>
                    <Text style={styles.formLabel}>Time</Text>
                    <View style={styles.inputWrap}>
                      <Icon name="clock" size={13} color={colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        value={departureTime}
                        onChangeText={setDepartureTime}
                        placeholder="11:00"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                </View>

                {tripType === 'ROUND_TRIP' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Return Date</Text>
                    <View style={styles.inputWrap}>
                      <Icon name="calendar-days" size={13} color={colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        value={returnDate}
                        onChangeText={setReturnDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  </View>
                )}

                {/* Passengers */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Passengers (Max {selectedJet?.capacity} Seats)
                  </Text>
                  <View style={styles.inputWrap}>
                    <Icon name="users" size={13} color={colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      value={passengerCount}
                      onChangeText={setPassengerCount}
                      keyboardType="number-pad"
                      placeholder="Number of passengers"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                {/* Lead Contact Info */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Lead Passenger Name</Text>
                  <View style={styles.inputWrap}>
                    <Icon name="user" size={13} color={colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      value={contactName}
                      onChangeText={setContactName}
                      placeholder="Full Name"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Contact Phone</Text>
                  <View style={styles.inputWrap}>
                    <Icon name="phone" size={13} color={colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      value={contactPhone}
                      onChangeText={setContactPhone}
                      keyboardType="phone-pad"
                      placeholder="+234..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                {/* Special Requests */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Special In-Flight Requests</Text>
                  <View style={[styles.inputWrap, { height: 70, alignItems: 'flex-start', paddingTop: 10 }]}>
                    <TextInput
                      style={[styles.input, { height: 50, textAlignVertical: 'top' }]}
                      value={specialRequests}
                      onChangeText={setSpecialRequests}
                      multiline
                      placeholder="e.g. Dom Pérignon on ice, VIP ramp vehicle transfer, halal catering..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                {/* Price Breakdown */}
                <View style={styles.breakdownCard}>
                  <Text style={styles.breakdownTitle}>Estimated Charter Price</Text>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Aircraft Base Charter Rate</Text>
                    <Text style={styles.breakdownVal}>{formatNaira(selectedJet?.pricePerHour ?? 0)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Refundable Security Caution</Text>
                    <Text style={styles.breakdownVal}>{formatNaira(selectedJet?.cautionFee ?? 0)}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Aviation Service Charge</Text>
                    <Text style={styles.breakdownVal}>₦400</Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.breakdownTotal]}>
                    <Text style={styles.totalLabel}>Total Estimated</Text>
                    <Text style={styles.totalVal}>
                      {formatNaira(
                        Number(selectedJet?.pricePerHour ?? 0) +
                        Number(selectedJet?.cautionFee ?? 0) +
                        400
                      )}
                    </Text>
                  </View>
                </View>

                {/* Confirm Action */}
                <View style={{ marginTop: 14, marginBottom: 30 }}>
                  <GoldButton
                    title={bookingLoading ? 'Reserving Aircraft...' : 'Confirm Charter Booking'}
                    onPress={handleConfirmBooking}
                    loading={bookingLoading}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: colors.textPrimary },

  tabRow: {
    flexDirection: 'row', backgroundColor: colors.cardBg,
    borderRadius: 14, marginHorizontal: 24, marginBottom: 12, padding: 4,
    borderWidth: 1, borderColor: colors.borderGold,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: colors.goldStart },
  tabText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.textMuted },
  tabActiveText: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#0A0A0F' },

  catScrollWrap: { marginBottom: 14 },
  catScroll: { paddingHorizontal: 24, gap: 8 },
  catPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  catPillActive: { backgroundColor: 'rgba(201,151,42,0.2)', borderColor: colors.borderGold },
  catPillText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.textSecondary },
  catPillTextActive: { fontFamily: 'Inter-Bold', color: colors.goldEnd },

  list: { paddingHorizontal: 24, paddingBottom: 32, gap: 18 },
  card: {
    backgroundColor: colors.cardBg, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.borderGold, ...shadows.card,
  },
  cardImage: { height: 180, justifyContent: 'space-between', padding: 14 },
  cardImageInner: { borderTopLeftRadius: 19, borderTopRightRadius: 19 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(201,151,42,0.4)',
  },
  categoryBadgeText: { fontFamily: 'Inter-Bold', fontSize: 10, color: colors.goldEnd, letterSpacing: 0.5 },
  tailBadge: { backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tailBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: 10, color: colors.textPrimary },
  cardImageFooter: {},
  jetName: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: colors.textPrimary },
  jetModel: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  cardContent: { padding: 16, gap: 12 },
  specsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  specItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  specText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.textPrimary },
  specDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.1)' },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locationText: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted, flex: 1 },

  priceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  priceLabel: { fontFamily: 'Inter-Regular', fontSize: 10, color: colors.textMuted },
  priceValue: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 18, color: colors.goldEnd },
  priceUnit: { fontFamily: 'Inter-Regular', fontSize: 10, color: colors.textMuted },

  bookBtn: { borderRadius: 12, overflow: 'hidden' },
  bookBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 11,
  },
  bookBtnText: { fontFamily: 'Inter-Bold', fontSize: 12, color: '#0A0A0F' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#0D0D16', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: colors.borderGold, maxHeight: '90%', padding: 24,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  modalTitle: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: colors.textPrimary },
  modalSubtitle: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.goldEnd, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cardBg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalScroll: {},

  tripTypeRow: {
    flexDirection: 'row', backgroundColor: colors.cardBg, borderRadius: 12,
    padding: 4, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tripTypeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tripTypeBtnActive: { backgroundColor: 'rgba(201,151,42,0.2)', borderWidth: 1, borderColor: colors.borderGold },
  tripTypeText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.textMuted },
  tripTypeTextActive: { fontFamily: 'Inter-Bold', color: colors.goldEnd },

  formGroup: { marginBottom: 14 },
  formLabel: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.textSecondary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, paddingHorizontal: 12, height: 46,
  },
  input: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textPrimary },
  rowTwo: { flexDirection: 'row', gap: 12 },

  breakdownCard: {
    backgroundColor: colors.cardBg, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(201,151,42,0.25)', marginTop: 8, gap: 8,
  },
  breakdownTitle: { fontFamily: 'Inter-Bold', fontSize: 12, color: colors.goldEnd, marginBottom: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted },
  breakdownVal: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.textPrimary },
  breakdownTotal: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 8, marginTop: 4,
  },
  totalLabel: { fontFamily: 'Inter-Bold', fontSize: 13, color: colors.textPrimary },
  totalVal: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 16, color: colors.goldEnd },
});
