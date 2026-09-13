import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { eventsAPI, BackendEvent } from '../../services/api';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

export const EventsListScreen = ({ navigation }: any) => {
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await eventsAPI.getEvents({ limit: 50 });
      setEvents(res.events ?? []);
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Events</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Events / Venues toggle — same pattern as the Cars/Jets toggle on Rides */}
        <View style={styles.tabRow}>
          <View style={styles.tabActive}>
            <Text style={styles.tabActiveText}>Events</Text>
          </View>
          <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('VenuesList')}>
            <Text style={styles.tabText}>Venues</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 24, gap: 14 }}>
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} height={160} />)}
          </View>
        ) : hasError ? (
          <ErrorState
            title="Couldn't load events"
            subtitle="Something went wrong. Tap to retry."
            onRetry={load}
            fullScreen
          />
        ) : events.length === 0 ? (
          <EmptyState icon="ticket" title="No events right now" subtitle="Check back soon for new events." />
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.eventCard}
                onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
                activeOpacity={0.9}
              >
                <ImageBackground
                  source={{ uri: item.images?.[0] }}
                  style={styles.eventCardBg}
                  imageStyle={{ borderRadius: 18 }}
                >
                  <LinearGradient
                    colors={['rgba(5,5,12,0.9)', 'rgba(5,5,12,0.2)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.eventCardContent}>
                    <Text style={styles.eventName}>{item.name}</Text>
                    <View style={styles.eventMeta}>
                      <Icon name="calendar" size={10} color={colors.goldEnd} />
                      <Text style={styles.eventMetaText}>
                        {new Date(item.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    {item.genre && (
                      <View style={styles.eventMeta}>
                        <Icon name="music" size={10} color={colors.goldEnd} />
                        <Text style={styles.eventMetaText}>{item.genre}</Text>
                      </View>
                    )}
                    <Text style={styles.eventPrice}>₦{formatNaira(item.ticketPrice)}</Text>
                  </View>
                </ImageBackground>
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
  tabRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 16 },
  tabActive: { paddingHorizontal: 20, paddingVertical: 9, backgroundColor: colors.goldEnd, borderRadius: 20 },
  tabActiveText: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#0A0A0F' },
  tab: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: colors.borderGold },
  tabText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textSecondary },
  list: { paddingHorizontal: 24, gap: 14, paddingBottom: 32 },
  eventCard: {
    height: 160, borderRadius: 18,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    overflow: 'hidden', ...shadows.card,
  },
  eventCardBg: { width: '100%', height: '100%' },
  eventCardContent: { flex: 1, padding: 18, justifyContent: 'center' },
  eventName: {
    fontFamily: 'PlayfairDisplay-Black', fontSize: 21, color: colors.textPrimary,
    textTransform: 'uppercase', marginBottom: 8,
  },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  eventMetaText: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textSecondary },
  eventPrice: { fontFamily: 'Inter-Bold', fontSize: 13, color: colors.goldEnd, marginTop: 6 },
});
