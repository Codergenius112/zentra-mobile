import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { venuesAPI, BackendVenue } from '../../services/api';
import { GoldButton } from '../../components/GoldButton';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { colors } from '../../theme/colors';

const times = ['9PM', '10PM', '11PM', '12AM'];

// Next 5 real calendar days rather than hardcoded labels — these need to become
// an actual booking timestamp, so they can't be static strings.
const buildUpcomingDates = () => {
  return Array.from({ length: 5 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d,
      label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
    };
  });
};

export const VenueDetailScreen = ({ route, navigation }: any) => {
  const { venueId } = route.params;
  const upcomingDates = useMemo(buildUpcomingDates, []);

  const [venue, setVenue] = useState<BackendVenue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedDate, setSelectedDate] = useState(upcomingDates[0]);
  const [selectedTime, setSelectedTime] = useState('10PM');

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await venuesAPI.getVenueById(venueId);
      setVenue(data);
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => { load(); }, [load]);

  const buildBookingDate = () => {
    const hour24 = { '9PM': 21, '10PM': 22, '11PM': 23, '12AM': 0 }[selectedTime] ?? 22;
    const d = new Date(selectedDate.date);
    d.setHours(hour24, 0, 0, 0);
    return d.toISOString();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonCard height={280} borderRadius={0} />
        <View style={{ padding: 22, gap: 12 }}>
          <SkeletonCard height={40} />
          <SkeletonCard height={20} />
          <SkeletonCard height={140} />
        </View>
      </View>
    );
  }

  if (hasError || !venue) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <ErrorState
            title="Couldn't load this venue"
            subtitle="Something went wrong. Tap to retry."
            onRetry={load}
          />
        </SafeAreaView>
      </View>
    );
  }

  const v = venue;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground source={{ uri: v.mediaUrls?.[0] }} style={styles.hero}>
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
          {/* Info */}
          <Text style={styles.venueName}>{v.name}</Text>
          <View style={styles.metaRow}>
            <Icon name="location-dot" size={11} color={colors.goldEnd} />
            <Text style={styles.metaText}>{v.address}, {v.city}</Text>
          </View>
          <View style={styles.metaRow}>
            <Icon name="users" size={11} color={colors.goldEnd} />
            <Text style={styles.metaText}>Up to {v.maxCapacity} guests</Text>
          </View>

          {/* Reserve a Table */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionLabel}>Reserve a Table</Text>

            {/* Date Picker */}
            <Text style={styles.subLabel}>Select Date</Text>
            <FlatList
              data={upcomingDates}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: 14 }}
              contentContainerStyle={{ gap: 8 }}
              keyExtractor={(item) => item.label}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.datePill, selectedDate.label === item.label && styles.datePillActive]}
                  onPress={() => setSelectedDate(item)}
                >
                  <Text style={[styles.datePillText, selectedDate.label === item.label && styles.datePillTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />

            {/* Time Slots */}
            <Text style={styles.subLabel}>Time</Text>
            <View style={styles.timeRow}>
              {times.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.timePill, selectedTime === t && styles.timePillActive]}
                  onPress={() => setSelectedTime(t)}
                >
                  <Text style={[styles.timePillText, selectedTime === t && styles.timePillTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 90 }} />
        </View>
      </ScrollView>

      {/* Reserve CTA */}
      <View style={styles.bottomCta}>
        <GoldButton
          title={`Reserve Table · ${selectedDate.label} ${selectedTime}`}
          onPress={() => navigation.navigate('SelectVenueTable', {
            venueId: v.id,
            venueName: v.name,
            bookingDate: buildBookingDate(),
          })}
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
  content: { paddingHorizontal: 22, marginTop: -60 },
  venueName: {
    fontFamily: 'PlayfairDisplay-Black', fontSize: 32,
    color: colors.textPrimary, textTransform: 'uppercase',
    marginBottom: 12, lineHeight: 38,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  metaText: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textSecondary },
  sectionCard: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 18, padding: 18, marginBottom: 14, marginTop: 18,
  },
  sectionLabel: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 17, color: colors.textPrimary, marginBottom: 14 },
  subLabel: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  datePill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.borderGold,
  },
  datePillActive: { backgroundColor: colors.goldEnd, borderColor: 'transparent' },
  datePillText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textSecondary },
  datePillTextActive: { color: '#0A0A0F', fontFamily: 'Inter-Bold' },
  partySizeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  partySizeLabel: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.textPrimary },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 24, overflow: 'hidden',
  },
  stepBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 20, color: colors.goldEnd, fontWeight: '600', lineHeight: 22 },
  stepCount: { minWidth: 32, textAlign: 'center', fontFamily: 'Inter-Bold', fontSize: 14, color: colors.textPrimary },
  timeRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  timePill: {
    paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.borderGold,
  },
  timePillActive: { backgroundColor: colors.goldEnd, borderColor: 'transparent' },
  timePillText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textSecondary },
  timePillTextActive: { color: '#0A0A0F', fontFamily: 'Inter-Bold' },
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 18, paddingBottom: 32,
    backgroundColor: 'rgba(10,10,15,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(201,151,42,0.12)',
  },
});
