import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground, FlatList, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 } from '@expo/vector-icons';
import { eventsAPI, venuesAPI, notificationsAPI, BackendEvent, BackendVenue } from '../../services/api';
import { useStore } from '../../store/useStore';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';

// Home's own events + venues (already fetched for the feed below) are what
// back this search — no separate network call. That keeps it snappy and
// consistent with what's already on screen, at the cost of not covering
// cars/apartments; the sliders button next to the field routes to Explore's
// full cross-category search for that.
type LocalSearchHit = {
  id: string;
  kind: 'event' | 'venue';
  title: string;
  meta: string;
  image?: string;
  navigateTo: { route: string; params: Record<string, any> };
};

const categories = [
  { label: 'Events',  icon: 'ticket', route: 'EventsList' },
  { label: 'Venues',  icon: 'building',      route: 'VenuesList' },
  { label: 'Stays',   icon: 'bed',           route: 'Stays' },
  { label: 'Rides',   icon: 'car',           route: 'Rides' },
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning,';
  if (hour < 17) return 'Good Afternoon,';
  return 'Good Evening,';
};

export const HomeScreen = ({ navigation }: any) => {
  const user = useStore((s) => s.user);

  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(false);

  const [venues, setVenues] = useState<BackendVenue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);

  const [unreadCount, setUnreadCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 250ms debounce so filtering below doesn't run on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(false);
    try {
      const res = await eventsAPI.getEvents({ limit: 6 });
      setEvents(res.events ?? []);
    } catch (err) {
      setEventsError(true);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const loadVenues = useCallback(async () => {
    setVenuesLoading(true);
    try {
      const res = await venuesAPI.getVenues({ limit: 10 });
      setVenues(res.data ?? []);
    } catch (err) {
      // Non-blocking — venues row just stays empty for now.
      // See services/api.ts note: GET /venues is currently staff-only on the backend.
      setVenues([]);
    } finally {
      setVenuesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    loadVenues();
    // Lightweight — the response includes unreadCount regardless of the
    // limit, so no need to fetch the full notification list just for this.
    notificationsAPI.getMyNotifications({ limit: 1 })
      .then((res) => setUnreadCount(res.unreadCount))
      .catch(() => {});
  }, [loadEvents, loadVenues]);

  const searchResults = useMemo((): LocalSearchHit[] => {
    if (!debouncedQuery) return [];
    const q = debouncedQuery.toLowerCase();
    const eventHits: LocalSearchHit[] = events
      .filter((e) => e.name.toLowerCase().includes(q))
      .map((e) => ({
        id: e.id,
        kind: 'event',
        title: e.name,
        meta: new Date(e.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        image: e.images?.[0],
        navigateTo: { route: 'EventDetail', params: { eventId: e.id } },
      }));
    const venueHits: LocalSearchHit[] = venues
      .filter((v) => v.name.toLowerCase().includes(q))
      .map((v) => ({
        id: v.id,
        kind: 'venue',
        title: v.name,
        meta: v.city,
        image: v.mediaUrls?.[0],
        navigateTo: { route: 'VenueDetail', params: { venueId: v.id } },
      }));
    return [...eventHits, ...venueHits];
  }, [debouncedQuery, events, venues]);

  const isSearching = debouncedQuery.length > 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user?.firstName ?? 'Guest'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <FontAwesome6 name="bell" size={18} color={colors.goldEnd} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <FontAwesome6 name="magnifying-glass" size={14} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, venues, stays..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
              <FontAwesome6 name="xmark" size={13} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => navigation.navigate('ExploreTab', { screen: 'ExploreHub', params: { autoFocus: true } })}
            hitSlop={8}
          >
            <FontAwesome6 name="sliders" size={14} color={colors.goldMid} />
          </TouchableOpacity>
        </View>

        {/* Categories — hidden while searching so the results list isn't
            competing with them for space. */}
        {!isSearching && (
          <View style={styles.categories}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.label}
                style={styles.catItem}
                onPress={() => navigation.navigate(cat.route)}
              >
                <View style={styles.catIconWrap}>
                  <FontAwesome6 name={cat.icon} size={20} color={colors.goldEnd} />
                </View>
                <Text style={styles.catLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isSearching ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {searchResults.length > 0 ? `Results for "${debouncedQuery}"` : 'No matches'}
              </Text>
            </View>
            {searchResults.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyRowText}>
                  Nothing in Events or Venues matches "{debouncedQuery}". Try Explore for Stays and Rides too.
                </Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 24, gap: 10 }}>
                {searchResults.map((hit) => (
                  <TouchableOpacity
                    key={`${hit.kind}-${hit.id}`}
                    style={styles.resultRow}
                    onPress={() => navigation.navigate(hit.navigateTo.route, hit.navigateTo.params)}
                    activeOpacity={0.85}
                  >
                    <ImageBackground
                      source={{ uri: hit.image }}
                      style={styles.resultThumb}
                      imageStyle={{ borderRadius: 10 }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultTitle} numberOfLines={1}>{hit.title}</Text>
                      <View style={styles.eventMeta}>
                        <FontAwesome6
                          name={hit.kind === 'event' ? 'calendar' : 'location-dot'}
                          size={9}
                          color={colors.goldEnd}
                        />
                        <Text style={styles.eventMetaText}>{hit.meta}</Text>
                      </View>
                    </View>
                    <FontAwesome6 name="chevron-right" size={12} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {/* Featured Events */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Events</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EventsList')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {eventsLoading ? (
            <View style={{ paddingHorizontal: 24, gap: 12 }}>
              <SkeletonCard height={148} />
              <SkeletonCard height={148} />
            </View>
          ) : eventsError ? (
            <ErrorState
              title="Couldn't load events"
              subtitle="Something went wrong. Tap to retry."
              onRetry={loadEvents}
            />
          ) : events.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyRowText}>No events on right now — check back soon.</Text>
            </View>
          ) : (
            <View style={styles.eventsContainer}>
              {events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={styles.eventCard}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                  activeOpacity={0.9}
                >
                  <ImageBackground
                    source={{ uri: event.images?.[0] }}
                    style={styles.eventCardBg}
                    imageStyle={{ borderRadius: 18 }}
                  >
                    <LinearGradient
                      colors={['rgba(5,5,12,0.9)', 'rgba(5,5,12,0.2)']}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={styles.eventCardOverlay}
                    />
                    <View style={styles.eventCardContent}>
                      <Text style={styles.eventName}>{event.name}</Text>
                      <View style={styles.eventMeta}>
                        <FontAwesome6 name="calendar" size={10} color={colors.goldEnd} />
                        <Text style={styles.eventMetaText}>
                          {new Date(event.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </Text>
                      </View>
                      {event.genre && (
                        <View style={styles.eventMeta}>
                          <FontAwesome6 name="music" size={10} color={colors.goldEnd} />
                          <Text style={styles.eventMetaText}>{event.genre}</Text>
                        </View>
                      )}
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Popular Venues */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Venues</Text>
            <TouchableOpacity onPress={() => navigation.navigate('VenuesList')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {venuesLoading ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 24 }}>
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} height={148} style={{ width: 148, marginRight: 12 }} />
              ))}
            </ScrollView>
          ) : venues.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyRowText}>Venues aren't available here yet.</Text>
            </View>
          ) : (
            <FlatList
              data={venues}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.venueCard}
                  onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
                >
                  <ImageBackground
                    source={{ uri: item.mediaUrls?.[0] }}
                    style={styles.venueCardImg}
                    imageStyle={{ borderRadius: 12, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
                  />
                  <View style={styles.venueCardInfo}>
                    <Text style={styles.venueCardName}>{item.name}</Text>
                    <View style={styles.eventMeta}>
                      <FontAwesome6 name="location-dot" size={9} color={colors.goldMid} />
                      <Text style={styles.venueLoc}>{item.city}</Text>
                    </View>
                    <View style={styles.eventMeta}>
                      <FontAwesome6 name="users" size={9} color={colors.goldEnd} />
                      <Text style={styles.venueRating}>Up to {item.maxCapacity}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 0,
  },
  greeting: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted },
  name: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 27, color: colors.textPrimary },
  headerRight: { flexDirection: 'row', gap: 12, marginTop: 4 },
  notifBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute', top: -5, right: -5,
    width: 17, height: 17, borderRadius: 9,
    backgroundColor: colors.goldEnd,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.bgPrimary,
  },
  notifBadgeText: { fontFamily: 'Inter-Bold', fontSize: 9, color: '#1a0f00' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 13, paddingHorizontal: 16, height: 48,
    marginHorizontal: 24, marginTop: 16,
  },
  searchInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textPrimary, padding: 0 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 14, padding: 10,
  },
  resultThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.bgPrimary },
  resultTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.textPrimary, marginBottom: 3 },
  categories: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 24, marginTop: 18, marginBottom: 4,
  },
  catItem: { alignItems: 'center', gap: 7 },
  catIconWrap: {
    width: 52, height: 52, borderRadius: 15,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  catLabel: { fontFamily: 'Inter-Medium', fontSize: 10, color: colors.textSecondary },
  scroll: { flex: 1, marginTop: 20 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 14,
  },
  sectionTitle: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 19, color: colors.textPrimary },
  seeAll: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.goldEnd },
  emptyRow: { paddingHorizontal: 24, marginBottom: 26 },
  emptyRowText: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted },
  eventsContainer: { paddingHorizontal: 24, gap: 13, marginBottom: 26 },
  eventCard: {
    height: 148, borderRadius: 18,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    overflow: 'hidden', ...shadows.card,
  },
  eventCardBg: { width: '100%', height: '100%' },
  eventCardOverlay: StyleSheet.absoluteFill,
  eventCardContent: { position: 'absolute', left: 0, top: 0, bottom: 0, padding: 18, justifyContent: 'center' },
  eventName: { fontFamily: 'PlayfairDisplay-Black', fontSize: 20, color: colors.textPrimary, textTransform: 'uppercase', marginBottom: 8 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  eventMetaText: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textSecondary },
  ticketTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(201,151,42,0.14)',
    borderWidth: 1, borderColor: 'rgba(201,151,42,0.28)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, alignSelf: 'flex-start', marginTop: 8,
  },
  ticketTagText: { fontFamily: 'Inter-SemiBold', fontSize: 10, color: colors.goldEnd },
  venueCard: {
    width: 148, borderRadius: 16,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    overflow: 'hidden',
  },
  venueCardImg: { width: '100%', height: 92 },
  venueCardInfo: { padding: 10, gap: 3 },
  venueCardName: { fontFamily: 'Inter-Bold', fontSize: 12, color: colors.textPrimary },
  venueLoc: { fontFamily: 'Inter-Regular', fontSize: 10, color: colors.textMuted },
  venueRating: { fontFamily: 'Inter-Bold', fontSize: 11, color: colors.goldEnd },
});