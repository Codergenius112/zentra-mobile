import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { venuesAPI, BackendVenue } from '../../services/api';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';

const categories = [
  { key: 'all',        label: 'All' },
  { key: 'club',        label: 'Clubs' },
  { key: 'restaurant',  label: 'Restaurants' },
  { key: 'lounge',       label: 'Lounges' },
];

export const VenuesListScreen = ({ navigation }: any) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [venues, setVenues] = useState<BackendVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async (category: string) => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await venuesAPI.getVenues(category === 'all' ? {} : { category });
      setVenues(res.data ?? []);
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(activeCategory); }, [activeCategory, load]);

  const activeLabel = categories.find((c) => c.key === activeCategory)?.label ?? 'venues';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Venues</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Category Filter Tabs */}
        <FlatList
          data={categories}
          horizontal
          style={styles.filterList}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterTab, activeCategory === item.key && styles.filterTabActive]}
              onPress={() => setActiveCategory(item.key)}
            >
              <Text style={[styles.filterText, activeCategory === item.key && styles.filterTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Venue List */}
        {isLoading ? (
          <View style={{ paddingHorizontal: 24, gap: 12, marginTop: 8 }}>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} height={140} />)}
          </View>
        ) : hasError ? (
          <ErrorState
            title="Couldn't load venues"
            subtitle="Something went wrong. Tap to retry."
            onRetry={() => load(activeCategory)}
            fullScreen
          />
        ) : venues.length === 0 ? (
          <EmptyState
            icon="building"
            title="No venues here yet"
            subtitle={activeCategory === 'all' ? 'Check back soon.' : `No ${activeLabel.toLowerCase()} yet.`}
          />
        ) : (
          <FlatList
            data={venues}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.venueCard}
                onPress={() => navigation.navigate('VenueDetail', { venueId: item.id })}
                activeOpacity={0.88}
              >
                <ImageBackground
                  source={{ uri: item.mediaUrls?.[0] }}
                  style={styles.venueImage}
                  imageStyle={{ borderTopLeftRadius: 18, borderBottomLeftRadius: 18 }}
                >
                  <LinearGradient
                    colors={['transparent', 'rgba(10,10,15,0.7)']}
                    style={StyleSheet.absoluteFill}
                  />
                </ImageBackground>
                <View style={styles.venueInfo}>
                  <Text style={styles.venueName}>{item.name}</Text>
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryPillText}>{item.category}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Icon name="location-dot" size={10} color={colors.goldMid} />
                    <Text style={styles.metaText}>{item.city}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Icon name="users" size={10} color={colors.goldEnd} />
                    <Text style={styles.metaText}>Up to {item.maxCapacity} guests</Text>
                  </View>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: colors.textPrimary },
  // flexGrow: 0 is the fix — without it a horizontal FlatList stretches to
  // fill whatever vertical space its parent has left, and its row items
  // stretch to match (flex cross-axis default), which is what was blowing
  // these pills up to nearly full screen height.
  filterList: { flexGrow: 0, marginBottom: 16 },
  filterRow: { paddingHorizontal: 24, gap: 10 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: colors.borderGold,
  },
  filterTabActive: { backgroundColor: colors.goldEnd, borderColor: 'transparent' },
  filterText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textSecondary },
  filterTextActive: { color: '#0A0A0F', fontFamily: 'Inter-Bold' },
  list: { paddingHorizontal: 24, gap: 13, paddingBottom: 32 },
  venueCard: {
    flexDirection: 'row', height: 140,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 18, overflow: 'hidden',
    ...shadows.card,
  },
  venueImage: { width: '42%', height: '100%' },
  venueInfo: { flex: 1, padding: 14, justifyContent: 'center', gap: 6 },
  venueName: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 15, color: colors.textPrimary, marginBottom: 2 },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,151,42,0.1)',
    borderWidth: 1, borderColor: 'rgba(201,151,42,0.3)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    marginBottom: 2,
  },
  categoryPillText: {
    fontFamily: 'Inter-SemiBold', fontSize: 9, color: colors.goldEnd,
    textTransform: 'capitalize',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted },
});
