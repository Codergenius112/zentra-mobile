import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, FlatList, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apartmentsAPI, ApartmentListing } from '../../services/api';
import { GoldButton } from '../../components/GoldButton';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { colors } from '../../theme/colors';
import { formatNaira } from '../../utils/formatNaira';

const amenityIcons: Record<string, string> = {
  'WiFi': 'wifi', 'Parking': 'square-parking', 'Gym': 'dumbbell',
  'Pool': 'water-ladder', 'TV': 'tv', 'Kitchen': 'kitchen-set',
};

const buildUpcomingDates = (count: number, offsetDays = 0) => {
  return Array.from({ length: count }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays + i);
    return { date: d, label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) };
  });
};

export const ApartmentDetailScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { stayId } = route.params;
  const checkInOptions = useMemo(() => buildUpcomingDates(10), []);

  const [apt, setApt] = useState<ApartmentListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [checkIn, setCheckIn] = useState<typeof checkInOptions[0] | null>(null);
  const [nights, setNights] = useState(1);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await apartmentsAPI.getListing(stayId);
      setApt(data);
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [stayId]);

  useEffect(() => { load(); }, [load]);

  const checkOutDate = checkIn ? new Date(checkIn.date.getTime() + nights * 86400000) : null;
  const total = apt ? apt.pricePerNight * nights : 0;

  const handleBook = async () => {
    if (!apt) return;
    if (!checkIn) {
      Alert.alert('Select a date', 'Please choose a check-in date before booking.');
      return;
    }
    setIsBooking(true);
    try {
      const booking = await apartmentsAPI.bookApartment({
        apartmentId: apt.id,
        checkInDate: checkIn.date.toISOString(),
        checkOutDate: (checkOutDate as Date).toISOString(),
        price: total,
      });
      // Booking is created as INITIATED/UNPAID at this point — hand off to
      // checkout to actually collect payment. Trust the booking's own
      // totalAmount rather than recomputing commission client-side, since
      // commissionPayer is an admin-configurable setting on the backend.
      navigation.navigate('Payment', {
        existingBookingId: booking.id,
        existingTotalAmount: booking.totalAmount,
        existingLabel: `${apt.name} · ${nights} night${nights > 1 ? 's' : ''}`,
        bookingType: 'apartment',
      });
    } catch (err) {
      // stays on screen — GoldButton loading state clears via finally below
    } finally {
      setIsBooking(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonCard height={280} borderRadius={0} />
        <View style={{ padding: 22, gap: 12 }}>
          <SkeletonCard height={40} />
          <SkeletonCard height={100} />
          <SkeletonCard height={140} />
        </View>
      </View>
    );
  }

  if (hasError || !apt) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <ErrorState title="Couldn't load this stay" subtitle="Something went wrong. Tap to retry." onRetry={load} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageBackground source={{ uri: apt.images?.[0] }} style={styles.hero}>
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
          <Text style={styles.aptName}>{apt.name}</Text>

          <View style={styles.infoRow}>
            <View style={styles.ratingPill}>
              <Icon name="bed" size={11} color={colors.goldEnd} />
              <Text style={styles.ratingText}>{apt.bedrooms} bed{apt.bedrooms !== 1 ? 's' : ''} · {apt.bathrooms} bath</Text>
            </View>
            <View style={styles.locationRow}>
              <Icon name="location-dot" size={11} color={colors.goldMid} />
              <Text style={styles.locationText}>{apt.address}, {apt.city}</Text>
            </View>
          </View>

          <Text style={styles.priceRow}>
            <Text style={styles.price}>₦{formatNaira(apt.pricePerNight)}</Text>
            <Text style={styles.perNight}> / night</Text>
          </Text>

          {apt.amenities?.length > 0 && (
            <View style={styles.amenitiesRow}>
              {apt.amenities.map((a) => (
                <View key={a} style={styles.amenityChip}>
                  <Icon name={amenityIcons[a] || 'circle-check'} size={12} color={colors.goldMid} />
                  <Text style={styles.amenityText}>{a}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.aboutText}>{apt.description}</Text>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Stay Details</Text>
            {[
              { icon: 'users', label: 'Max Guests', value: `${apt.maxGuests}` },
              { icon: 'mobile-screen', label: 'Access', value: 'Digital Key via App' },
              apt.cautionFee > 0 && {
                icon: 'shield-halved', label: 'Caution Fee',
                value: `₦${formatNaira(apt.cautionFee)} ${apt.cautionFeeRefundable ? '(refundable)' : ''}`,
              },
            ].filter(Boolean).map((row: any) => (
              <View key={row.label} style={styles.checkRow}>
                <View style={styles.checkIconWrap}>
                  <Icon name={row.icon} size={13} color={colors.goldMid} />
                </View>
                <Text style={styles.checkLabel}>{row.label}</Text>
                <Text style={styles.checkValue}>{row.value}</Text>
              </View>
            ))}
            {apt.houseRules && (
              <Text style={styles.houseRules}>{apt.houseRules}</Text>
            )}
          </View>

          {/* Date Selection */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Select Dates</Text>
            <Text style={styles.subLabel}>Check-In</Text>
            <FlatList
              data={checkInOptions}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 14 }}
              contentContainerStyle={{ gap: 8 }}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.datePill, checkIn?.label === item.label && styles.datePillActive]}
                  onPress={() => setCheckIn(item)}
                >
                  <Text style={[styles.datePillText, checkIn?.label === item.label && styles.datePillTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Text style={styles.subLabel}>Nights</Text>
            <View style={styles.nightsRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => nights > 1 && setNights(nights - 1)}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.nightsCount}>{nights} night{nights > 1 ? 's' : ''}</Text>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setNights(nights + 1)}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {checkIn && (
              <View style={styles.totalCalc}>
                <Text style={styles.totalCalcText}>
                  ₦{formatNaira(apt.pricePerNight)} × {nights} night{nights > 1 ? 's' : ''}
                </Text>
                <Text style={styles.totalCalcValue}>₦{formatNaira(total)}</Text>
              </View>
            )}
          </View>

          <View style={{ height: 90 }} />
        </View>
      </ScrollView>

      <View style={[styles.bottomCta, { paddingBottom: 18 + insets.bottom }]}>
        <View style={styles.ctaSummary}>
          <Text style={styles.ctaPrice}>₦{formatNaira(apt.pricePerNight)}</Text>
          <Text style={styles.ctaNights}>{checkIn ? `${nights} night${nights > 1 ? 's' : ''}` : 'per night'}</Text>
        </View>
        <GoldButton
          title="Book Now"
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
  hero: { height: 280 },
  heroTopGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
  heroBottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 140 },
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
  content: { paddingHorizontal: 22, marginTop: -50 },
  aptName: {
    fontFamily: 'PlayfairDisplay-Bold', fontSize: 26, color: colors.textPrimary,
    textTransform: 'uppercase', marginBottom: 10, lineHeight: 32,
  },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 8, flexWrap: 'wrap' },
  ratingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(201,151,42,0.1)',
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  ratingText: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.goldEnd },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textSecondary },
  priceRow: { marginBottom: 16 },
  price: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: colors.goldEnd },
  perNight: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textMuted },
  amenitiesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 18 },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5,
  },
  amenityText: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textSecondary },
  sectionCard: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 18, padding: 18, marginBottom: 14,
  },
  sectionLabel: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 16, color: colors.textPrimary, marginBottom: 14 },
  subLabel: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  aboutText: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textSecondary, lineHeight: 22 },
  houseRules: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 12 },
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  checkIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: 'rgba(201,151,42,0.1)',
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  checkLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textMuted, flex: 1 },
  checkValue: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.textPrimary },
  datePill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.borderGold,
  },
  datePillActive: { backgroundColor: colors.goldEnd, borderColor: 'transparent' },
  datePillText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textSecondary },
  datePillTextActive: { color: '#0A0A0F', fontFamily: 'Inter-Bold' },
  nightsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 20, color: colors.goldEnd, fontWeight: '600', lineHeight: 22 },
  nightsCount: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.textPrimary },
  totalCalc: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  totalCalcText: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textSecondary },
  totalCalcValue: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.goldEnd },
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, paddingBottom: 32,
    backgroundColor: 'rgba(10,10,15,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(201,151,42,0.12)',
  },
  ctaSummary: { gap: 2 },
  ctaPrice: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 18, color: colors.goldEnd },
  ctaNights: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted },
});
