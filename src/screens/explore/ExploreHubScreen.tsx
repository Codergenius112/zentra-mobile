import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import {
  eventsAPI, venuesAPI, carsAPI, apartmentsAPI,
  BackendEvent, BackendVenue, CarListing, ApartmentListing,
} from '../../services/api';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

type ItemType = 'event' | 'venue' | 'car' | 'apartment';

interface UnifiedItem {
  id: string;
  type: ItemType;
  title: string;
  image?: string;
  priceLabel: string;
  meta: string;
  isAvailable: boolean;
  navigateTo: { route: string; params: Record<string, any> };
}

const typeFilters: { key: 'all' | ItemType; label: string; icon: string }[] = [
  { key: 'all',       label: 'All',       icon: 'grip' },
  { key: 'event',     label: 'Events',    icon: 'ticket' },
  { key: 'venue',     label: 'Venues',    icon: 'building' },
  { key: 'car',       label: 'Cars',      icon: 'car' },
  { key: 'apartment', label: 'Apartments', icon: 'bed' },
];

const typeIcon: Record<ItemType, string> = {
  event: 'ticket', venue: 'building', car: 'car', apartment: 'bed',
};

const isDateUnavailableToday = (unavailableDates: string[] | null | undefined) => {
  if (!unavailableDates?.length) return false;
  const today = new Date().toISOString().split('T')[0];
  return unavailableDates.some((d) => d.startsWith(today));
};

export const ExploreHubScreen = ({ navigation, route }: any) => {
  const [activeType, setActiveType] = useState<'all' | ItemType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [venues, setVenues] = useState<BackendVenue[]>([]);
  const [cars, setCars] = useState<CarListing[]>([]);
  const [apartments, setApartments] = useState<ApartmentListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      // allSettled, not all: GET /venues is staff-only and 403s for customers
      // (see HomeScreen's note on the same endpoint). With Promise.all that one
      // rejection would blank the whole tab even when the other three loaded.
      const [eventsRes, venuesRes, carsRes, apartmentsRes] = await Promise.allSettled([
        eventsAPI.getEvents({ limit: 50 }),
        venuesAPI.getVenues(),
        carsAPI.getListings({ limit: 50 }),
        apartmentsAPI.getListings({ limit: 50 }),
      ]);
      const value = (r: PromiseSettledResult<any>) => (r.status === 'fulfilled' ? r.value : null);

      setEvents(value(eventsRes)?.events ?? []);
      setVenues(value(venuesRes)?.data ?? []);
      setCars(value(carsRes)?.listings ?? []);
      setApartments(value(apartmentsRes)?.listings ?? []);

      // Only a total failure is worth an error state — if anything came back,
      // the tab is usable and the missing category simply shows nothing.
      const anyOk = [eventsRes, venuesRes, carsRes, apartmentsRes]
        .some((r) => r.status === 'fulfilled');
      setHasError(!anyOk);
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Normalize all four sources into one common shape so they can share a
  // single feed, filter row, and card layout.
  const unifiedItems = useMemo((): UnifiedItem[] => {
    const eventItems: UnifiedItem[] = events.map((e) => ({
      id: e.id,
      type: 'event',
      title: e.name,
      image: e.images?.[0],
      priceLabel: `₦${formatNaira(e.ticketPrice)}`,
      meta: new Date(e.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      isAvailable: e.status === 'active' && new Date(e.startDate) > new Date(),
      navigateTo: { route: 'EventDetail', params: { eventId: e.id } },
    }));

    const venueItems: UnifiedItem[] = venues.map((v) => ({
      id: v.id,
      type: 'venue',
      title: v.name,
      image: v.mediaUrls?.[0],
      priceLabel: v.category,
      meta: `${v.city} · Up to ${v.maxCapacity}`,
      isAvailable: v.isActive,
      navigateTo: { route: 'VenueDetail', params: { venueId: v.id } },
    }));

    const carItems: UnifiedItem[] = cars.map((c) => ({
      id: c.id,
      type: 'car',
      title: `${c.make} ${c.model}`,
      image: c.images?.[0],
      priceLabel: `₦${formatNaira(c.pricePerDay)}/day`,
      meta: `${c.city} · ${c.seats} seats`,
      isAvailable: c.isActive && !isDateUnavailableToday(c.unavailableDates),
      navigateTo: { route: 'RideDetail', params: { rideId: c.id } },
    }));

    const apartmentItems: UnifiedItem[] = apartments.map((a) => ({
      id: a.id,
      type: 'apartment',
      title: a.name,
      image: a.images?.[0],
      priceLabel: `₦${formatNaira(a.pricePerNight)}/night`,
      meta: `${a.city} · ${a.bedrooms} bed${a.bedrooms !== 1 ? 's' : ''}`,
      isAvailable: a.isActive && !isDateUnavailableToday(a.unavailableDates),
      navigateTo: { route: 'ApartmentDetail', params: { stayId: a.id } },
    }));

    return [...eventItems, ...venueItems, ...carItems, ...apartmentItems];
  }, [events, venues, cars, apartments]);

  const filteredItems = unifiedItems.filter((item) => {
    if (activeType !== 'all' && item.type !== activeType) return false;
    if (availableOnly && !item.isAvailable) return false;
    if (searchQuery.trim() && !item.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <TouchableOpacity
            style={[styles.availToggle, availableOnly && styles.availToggleActive]}
            onPress={() => setAvailableOnly((v) => !v)}
          >
            <Icon name="circle-check" size={12} color={availableOnly ? '#0A0A0F' : colors.textMuted} />
            <Text style={[styles.availToggleText, availableOnly && styles.availToggleTextActive]}>
              Available Only
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Icon name="magnifying-glass" size={13} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, venues, cars, stays..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={route?.params?.autoFocus === true}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="xmark" size={13} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type filter row */}
        <View style={styles.filterWrap}>
          <FlatList
            data={typeFilters}
            horizontal
            style={styles.filterList}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterTab, activeType === item.key && styles.filterTabActive]}
                onPress={() => setActiveType(item.key)}
              >
                <Icon name={item.icon} size={11} color={activeType === item.key ? '#0A0A0F' : colors.goldMid} />
                <Text style={[styles.filterText, activeType === item.key && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
          {/* Fades the trailing edge so a partially-cut tab reads as
              "scroll for more" instead of looking like a rendering glitch. */}
          <LinearGradient
            colors={['transparent', colors.bgPrimary]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.filterFade}
            pointerEvents="none"
          />
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 24, gap: 12, marginTop: 8 }}>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} height={140} />)}
          </View>
        ) : hasError ? (
          <ErrorState title="Couldn't load listings" subtitle="Something went wrong. Tap to retry." onRetry={load} fullScreen />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon="magnifying-glass"
            title="Nothing matches"
            subtitle={availableOnly ? 'Try turning off "Available Only" or a different category.' : 'Try a different category.'}
          />
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.card, !item.isAvailable && styles.cardUnavailable]}
                onPress={() => item.isAvailable && navigation.navigate(item.navigateTo.route, item.navigateTo.params)}
                activeOpacity={item.isAvailable ? 0.88 : 1}
                disabled={!item.isAvailable}
              >
                <ImageBackground source={{ uri: item.image }} style={styles.cardImage}>
                  <LinearGradient colors={['transparent', 'rgba(10,10,15,0.75)']} style={StyleSheet.absoluteFill} />
                  <View style={styles.typeBadge}>
                    <Icon name={typeIcon[item.type]} size={9} color={colors.goldEnd} />
                  </View>
                  {!item.isAvailable && (
                    <View style={styles.unavailableBadge}>
                      <Text style={styles.unavailableText}>Unavailable</Text>
                    </View>
                  )}
                </ImageBackground>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>{item.meta}</Text>
                  <Text style={styles.cardPrice}>{item.priceLabel}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16,
  },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 24, color: colors.textPrimary },
  availToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  availToggleActive: { backgroundColor: colors.goldEnd, borderColor: 'transparent' },
  availToggleText: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.textMuted },
  availToggleTextActive: { color: '#0A0A0F', fontFamily: 'Inter-Bold' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 13, paddingHorizontal: 16, height: 46,
    marginHorizontal: 24, marginBottom: 16,
  },
  searchInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textPrimary },
  filterWrap: { position: 'relative', marginBottom: 16 },
  filterList: { flexGrow: 0 },
  filterRow: { paddingHorizontal: 24, gap: 10, paddingRight: 48 },
  filterFade: {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: 40,
  },
  filterTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: colors.borderGold,
  },
  filterTabActive: { backgroundColor: colors.goldEnd, borderColor: 'transparent' },
  filterText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.textSecondary },
  filterTextActive: { color: '#0A0A0F', fontFamily: 'Inter-Bold' },
  list: { paddingHorizontal: 24, gap: 14, paddingBottom: 32 },
  card: {
    flexDirection: 'row', height: 110,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 16, overflow: 'hidden',
    ...shadows.card,
  },
  cardUnavailable: { opacity: 0.5 },
  cardImage: { width: 110, height: '100%', justifyContent: 'flex-start', padding: 8 },
  typeBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(10,10,15,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },
  unavailableBadge: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderRadius: 8, paddingVertical: 3, alignItems: 'center',
  },
  unavailableText: { fontFamily: 'Inter-SemiBold', fontSize: 9, color: '#F87171' },
  cardInfo: { flex: 1, padding: 12, justifyContent: 'center', gap: 4 },
  cardTitle: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 14, color: colors.textPrimary },
  cardMeta: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted },
  cardPrice: { fontFamily: 'Inter-Bold', fontSize: 13, color: colors.goldEnd },
});
