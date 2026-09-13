import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { eventsAPI, venuesAPI, BackendEvent } from '../../services/api';
import { Stepper } from '../../components/Stepper';
import { GoldButton } from '../../components/GoldButton';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { colors } from '../../theme/colors';
import { formatNaira } from '../../utils/formatNaira';

export const EventDetailScreen = ({ route, navigation }: any) => {
  const { eventId } = route.params;
  const [event, setEvent] = useState<BackendEvent | null>(null);
  const [venueName, setVenueName] = useState<string | null>(null);
  const [resolvedVenueId, setResolvedVenueId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [ticketQty, setTicketQty] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await eventsAPI.getEventById(eventId);
      setEvent(data);
      // GET /venues/:id is now open to customers — only try if the event
      // actually has a venue (one-off events with no venueId won't).
      if (data.venueId) {
        try {
          const venue = await venuesAPI.getVenueById(data.venueId);
          setVenueName(venue.name);
          setResolvedVenueId(venue.id);
        } catch {
          setVenueName(null);
          setResolvedVenueId(null);
        }
      } else {
        setResolvedVenueId(null);
      }
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const total = ticketQty * (event?.ticketPrice ?? 0);

  const handleContinueWithTickets = () => {
    navigation.navigate('Payment', {
      eventId,
      venueId: resolvedVenueId ?? event?.venueId,
      quantity: ticketQty,
      totalPrice: total,
      eventLabel: event?.name,
    });
  };

  const handleBrowseTables = () => {
    navigation.navigate('SelectTable', {
      eventId,
      venueId: resolvedVenueId ?? event?.venueId,
      // carry ticket selection forward so checkout can combine both if the user adds a table
      ticketQty,
      ticketTotal: total,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SkeletonCard height={290} borderRadius={0} />
        <View style={{ padding: 22, gap: 12 }}>
          <SkeletonCard height={40} />
          <SkeletonCard height={20} />
          <SkeletonCard height={120} />
        </View>
      </View>
    );
  }

  if (hasError || !event) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <ErrorState
            title="Couldn't load this event"
            subtitle="Something went wrong. Tap to retry."
            onRetry={load}
          />
        </SafeAreaView>
      </View>
    );
  }

  const ev = event;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <ImageBackground source={{ uri: ev.images?.[0] }} style={styles.hero}>
          <LinearGradient
            colors={['rgba(10,10,15,0.85)', 'transparent']}
            style={styles.heroTopGradient}
          />
          <LinearGradient
            colors={['transparent', colors.bgPrimary]}
            style={styles.heroBottomGradient}
          />
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

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.eventTitle}>{ev.name}</Text>
          <View style={styles.locationRow}>
            <Icon name="location-dot" size={12} color={colors.goldEnd} />
            <Text style={styles.locationText}>{venueName ?? 'Venue details unavailable'}</Text>
          </View>
          <View style={styles.metaRow}>
            {[
              { icon: 'calendar', text: new Date(ev.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) },
              { icon: 'clock', text: new Date(ev.startDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) },
              ev.dresscode && { icon: 'shirt', text: ev.dresscode },
            ].filter(Boolean).map((m: any, i) => (
              <View key={i} style={styles.metaChip}>
                <Icon name={m.icon} size={10} color={colors.goldEnd} />
                <Text style={styles.metaText}>{m.text}</Text>
              </View>
            ))}
          </View>
          {ev.genre && (
            <View style={styles.tagsRow}>
              <View style={styles.genreTag}>
                <Text style={styles.genreText}>{ev.genre}</Text>
              </View>
            </View>
          )}
          {ev.djs && ev.djs.length > 0 && (
            <View style={styles.tagsRow}>
              {ev.djs.map((dj) => (
                <View key={dj} style={styles.genreTag}>
                  <Text style={styles.genreText}>{dj}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* About */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>About Event</Text>
          <Text style={styles.aboutText}>{ev.description}</Text>
        </View>

        {/* Tickets */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>Tickets</Text>
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>General Admission</Text>
              <Text style={styles.itemPrice}>₦{formatNaira(ev.ticketPrice)}</Text>
            </View>
            <Stepper value={ticketQty} max={10} onChange={setTicketQty} />
          </View>
        </View>

        {/* Separator */}
        <View style={styles.separator}>
          <View style={styles.sepLine} />
          <Text style={styles.sepText}>BUY TICKETS · A TABLE · OR BOTH</Text>
          <View style={styles.sepLine} />
        </View>

        {/* Tables — hands off to the real table catalog for this venue */}
        <View style={[styles.sectionCard, styles.tablesCard]}>
          <View style={styles.optionalLabel}>
            <Icon name="circle-info" size={10} color={colors.goldMid} />
            <Text style={styles.optionalText}>
              Tables are <Text style={{ color: colors.goldEnd, fontFamily: 'Inter-SemiBold' }}>optional</Text> — buy tickets, a table, or both.
            </Text>
          </View>
          <TouchableOpacity style={styles.browseTablesBtn} onPress={handleBrowseTables}>
            <Icon name="champagne-glasses" size={14} color={colors.goldEnd} />
            <Text style={styles.browseTablesText}>Browse Available Tables</Text>
            <Icon name="chevron-right" size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomCta}>
        <View style={styles.ctaRow}>
          <View>
            <Text style={styles.ctaLabel}>Order Summary</Text>
            <Text style={styles.ctaBreakdown}>
              {ticketQty > 0 ? `${ticketQty} ticket${ticketQty > 1 ? 's' : ''}` : 'Nothing selected'}
            </Text>
          </View>
          <Text style={styles.ctaTotal}>₦{formatNaira(total)}</Text>
        </View>
        <GoldButton
          title="Continue"
          onPress={handleContinueWithTickets}
          disabled={ticketQty === 0}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  hero: { height: 290, justifyContent: 'flex-end' },
  heroTopGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
  heroBottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 },
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
  info: { padding: 22, marginTop: -60 },
  eventTitle: {
    fontFamily: 'PlayfairDisplay-Black', fontSize: 38, color: colors.goldEnd,
    textTransform: 'uppercase', lineHeight: 44, marginBottom: 10,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  locationText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textSecondary },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5,
  },
  metaText: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.textSecondary },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  genreTag: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(201,151,42,0.1)',
    borderWidth: 1, borderColor: 'rgba(201,151,42,0.32)',
  },
  genreText: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.goldEnd },
  sectionCard: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 18, padding: 18, marginHorizontal: 18, marginBottom: 14,
  },
  aboutText: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  tablesCard: { backgroundColor: '#111128' },
  sectionLabel: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 16, color: colors.textPrimary, marginBottom: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  itemInfo: { flex: 1, paddingRight: 12 },
  itemName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: 2 },
  itemPrice: { fontFamily: 'Inter-Bold', fontSize: 15, color: colors.goldEnd },
  optionalLabel: {
    flexDirection: 'row', gap: 7, alignItems: 'flex-start',
    backgroundColor: 'rgba(201,151,42,0.06)',
    borderWidth: 1, borderColor: 'rgba(201,151,42,0.16)',
    borderRadius: 10, padding: 10, marginBottom: 14,
  },
  optionalText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 11, color: colors.goldMid, lineHeight: 16 },
  browseTablesBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
  },
  browseTablesText: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.textPrimary },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, marginBottom: 14 },
  sepLine: { flex: 1, height: 1, backgroundColor: 'rgba(201,151,42,0.18)' },
  sepText: { fontFamily: 'Inter-Medium', fontSize: 10, color: colors.textMuted, letterSpacing: 0.5 },
  bottomCta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 18, paddingBottom: 32,
    backgroundColor: 'rgba(10,10,15,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(201,151,42,0.12)',
  },
  ctaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ctaLabel: { fontFamily: 'Inter-Medium', fontSize: 11, color: colors.textMuted },
  ctaBreakdown: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textSecondary },
  ctaTotal: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: colors.goldEnd },
});
