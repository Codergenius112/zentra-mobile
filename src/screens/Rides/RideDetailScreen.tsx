import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, FlatList, TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { carsAPI, CarListing } from '../../services/api';
import { GoldButton } from '../../components/GoldButton';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { colors } from '../../theme/colors';
import { formatNaira } from '../../utils/formatNaira';

const durations = [
  { label: '1 Day', days: 1 },
  { label: '2 Days', days: 2 },
  { label: '3 Days', days: 3 },
  { label: '1 Week', days: 7 },
];

const buildUpcomingDates = (count: number) => Array.from({ length: count }).map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return { date: d, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
});

export const RideDetailScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { rideId } = route.params;
  const pickupOptions = useMemo(() => buildUpcomingDates(10), []);

  const [ride, setRide] = useState<CarListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [pickupDate, setPickupDate] = useState<typeof pickupOptions[0] | null>(null);
  const [duration, setDuration] = useState(durations[0]);
  const [driverLicense, setDriverLicense] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await carsAPI.getListing(rideId);
      setRide(data);
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [rideId]);

  useEffect(() => { load(); }, [load]);

  const total = ride ? ride.pricePerDay * duration.days : 0;
  const canBook = !!pickupDate && driverLicense.trim().length >= 4 && pickupLocation.trim().length >= 3;

  const handleBook = async () => {
    if (!ride) return;
    if (!pickupDate) {
      Alert.alert('Select a pickup date', 'Please choose a pickup date before booking.');
      return;
    }
    if (driverLicense.trim().length < 4) {
      Alert.alert('Driver\'s license required', 'Please enter a valid license number.');
      return;
    }
    if (pickupLocation.trim().length < 3) {
      Alert.alert('Pickup location required', 'Please enter where you\'d like to be picked up.');
      return;
    }
    setIsBooking(true);
    try {
      const returnDate = new Date(pickupDate.date.getTime() + duration.days * 86400000);
      const booking = await carsAPI.rentCar({
        carId: ride.id,
        pickupDate: pickupDate.date.toISOString(),
        returnDate: returnDate.toISOString(),
        price: total,
        driverLicense: driverLicense.trim(),
        pickupLocation: pickupLocation.trim(),
      });
      navigation.navigate('Payment', {
        existingBookingId: booking.id,
        existingTotalAmount: booking.totalAmount,
        existingLabel: `${ride.make} ${ride.model} · ${duration.label}`,
        bookingType: 'car',
      });
    } catch (err: any) {
      // Without this the rejection goes unhandled and the button simply stops
      // spinning with no explanation. Nothing was charged, so stay on screen.
      Alert.alert(
        'Booking failed',
        err?.response?.data?.message || "We couldn't reserve this ride. Please try again.",
      );
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonCard height={260} borderRadius={0} />
        <View style={{ padding: 22, gap: 12 }}>
          <SkeletonCard height={40} />
          <SkeletonCard height={100} />
          <SkeletonCard height={140} />
        </View>
      </View>
    );
  }

  if (hasError || !ride) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <ErrorState title="Couldn't load this ride" subtitle="Something went wrong. Tap to retry." onRetry={load} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageBackground source={{ uri: ride.images?.[0] }} style={styles.hero}>
          <LinearGradient colors={['rgba(10,10,15,0.8)', 'transparent']} style={styles.heroTopGrad} />
          <LinearGradient colors={['transparent', colors.bgPrimary]} style={styles.heroBottomGrad} />
          <SafeAreaView style={styles.topNav}>
            <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={14} color="#fff" />
            </TouchableOpacity>
            <View style={styles.navRight}>
              <TouchableOpacity style={styles.navBtn}>
                <Icon name="arrow-up-from-bracket" size={13} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn}>
                <Icon name="heart" size={13} color={colors.goldEnd} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ImageBackground>

        <View style={styles.content}>
          <Text style={styles.rideName}>{ride.make} {ride.model}</Text>
          <View style={styles.typePillRow}>
            <View style={styles.typePill}>
              <Text style={styles.typeText}>{ride.category}</Text>
            </View>
          </View>

          {!!ride.businessName && (
            <View style={styles.hostRow}>
              <Icon name="building" size={11} color={colors.goldMid} />
              <Text style={styles.hostText}>Offered by {ride.businessName}</Text>
            </View>
          )}

          <View style={styles.chipsRow}>
            {[
              { icon: 'user-group', text: `${ride.seats} Seats` },
              { icon: 'gear',       text: ride.transmission },
              { icon: 'palette',    text: ride.color },
              { icon: 'id-card',    text: ride.withDriver ? 'Chauffeur-Driven' : 'Self-Drive' },
            ].map(({ icon, text }) => (
              <View key={text} style={styles.chip}>
                <Icon name={icon} size={11} color={colors.goldMid} />
                <Text style={styles.chipText}>{text}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.priceRow}>
            <Text style={styles.price}>₦{formatNaira(ride.pricePerDay)}</Text>
            <Text style={styles.perDay}> / day</Text>
          </Text>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>About this Ride</Text>
            <Text style={styles.aboutText}>{ride.description}</Text>
          </View>

          {ride.features?.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>Car Features</Text>
              {ride.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Icon name="check" size={12} color={colors.goldEnd} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Booking Details</Text>

            {!ride.withDriver && (
              <>
                <Text style={styles.subLabel}>Driver's License Number</Text>
                <View style={styles.inputRow}>
                  <Icon name="id-card" size={13} color={colors.goldMid} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter license number"
                    placeholderTextColor={colors.textMuted}
                    value={driverLicense}
                    onChangeText={setDriverLicense}
                    autoCapitalize="characters"
                  />
                </View>
              </>
            )}
            {ride.withDriver && (
              <>
                <Text style={styles.subLabel}>Your License (for verification)</Text>
                <View style={styles.inputRow}>
                  <Icon name="id-card" size={13} color={colors.goldMid} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter license number"
                    placeholderTextColor={colors.textMuted}
                    value={driverLicense}
                    onChangeText={setDriverLicense}
                    autoCapitalize="characters"
                  />
                </View>
              </>
            )}

            <Text style={styles.subLabel}>Pickup Location</Text>
            <View style={styles.inputRow}>
              <Icon name="location-dot" size={13} color={colors.goldMid} />
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Murtala Muhammed Airport, Terminal 2"
                placeholderTextColor={colors.textMuted}
                value={pickupLocation}
                onChangeText={setPickupLocation}
              />
            </View>

            <Text style={styles.subLabel}>Pickup Date</Text>
            <FlatList
              data={pickupOptions}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 8 }}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.durationPill, pickupDate?.label === item.label && styles.durationPillActive]}
                  onPress={() => setPickupDate(item)}
                >
                  <Text style={[styles.durationText, pickupDate?.label === item.label && styles.durationTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <Text style={styles.subLabel}>Duration</Text>
            <FlatList
              data={durations}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ gap: 8 }}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.durationPill, duration.label === item.label && styles.durationPillActive]}
                  onPress={() => setDuration(item)}
                >
                  <Text style={[styles.durationText, duration.label === item.label && styles.durationTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          <View style={{ height: 90 }} />
        </View>
      </ScrollView>

      <View style={[styles.bottomCta, { paddingBottom: 18 + insets.bottom }]}>
        <View style={styles.ctaSummary}>
          <Text style={styles.ctaPrice}>₦{formatNaira(total)}</Text>
          <Text style={styles.ctaDuration}>{duration.label}</Text>
        </View>
        <GoldButton
          title="Book Ride"
          onPress={handleBook}
          loading={isBooking}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  hero: { height: 260 },
  heroTopGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
  heroBottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 130 },
  topNav: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 50,
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(14,14,22,0.7)',
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  navRight: { flexDirection: 'row', gap: 10 },
  content: { paddingHorizontal: 22, marginTop: -40 },
  rideName: {
    fontFamily: 'PlayfairDisplay-Black', fontSize: 30,
    color: colors.textPrimary, textTransform: 'uppercase',
    marginBottom: 10, lineHeight: 36,
  },
  typePillRow: { marginBottom: 12 },
  typePill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(108,184,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(108,184,255,0.3)',
    alignSelf: 'flex-start',
  },
  typeText: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: colors.rides, textTransform: 'capitalize' },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  hostText: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textSecondary },
  chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5,
  },
  chipText: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textSecondary, textTransform: 'capitalize' },
  priceRow: { marginBottom: 18 },
  price: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: colors.goldEnd },
  perDay: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textMuted },
  sectionCard: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 18, padding: 18, marginBottom: 14,
  },
  sectionLabel: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 16, color: colors.textPrimary, marginBottom: 14 },
  aboutText: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textSecondary, lineHeight: 22 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  featureText: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textSecondary },
  subLabel: {
    fontFamily: 'Inter-Medium', fontSize: 11, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 14,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 12, paddingHorizontal: 14, height: 48,
  },
  textInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textPrimary },
  durationPill: {
    paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.borderGold,
  },
  durationPillActive: { backgroundColor: colors.goldEnd, borderColor: 'transparent' },
  durationText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textSecondary },
  durationTextActive: { color: '#0A0A0F', fontFamily: 'Inter-Bold' },
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, paddingBottom: 32,
    backgroundColor: 'rgba(10,10,15,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(201,151,42,0.12)',
  },
  ctaSummary: { gap: 2 },
  ctaPrice: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 18, color: colors.goldEnd },
  ctaDuration: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted },
});