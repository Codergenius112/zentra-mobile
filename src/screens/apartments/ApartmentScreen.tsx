import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { apartmentsAPI, ApartmentListing } from '../../services/api';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

export const StaysScreen = ({ navigation }: any) => {
  const [listings, setListings] = useState<ApartmentListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await apartmentsAPI.getListings();
      setListings(res.listings ?? []);
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
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Stays</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Tab — Apartments only (no other stay type exists on the backend yet) */}
        <View style={styles.tabRow}>
          <View style={styles.tabActive}>
            <Text style={styles.tabActiveText}>Apartments</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 24, gap: 14 }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} height={220} />)}
          </View>
        ) : hasError ? (
          <ErrorState
            title="Couldn't load apartments"
            subtitle="Something went wrong. Tap to retry."
            onRetry={load}
            fullScreen
          />
        ) : listings.length === 0 ? (
          <EmptyState icon="bed" title="No stays available" subtitle="Check back soon for new listings." />
        ) : (
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('ApartmentDetail', { stayId: item.id })}
                activeOpacity={0.9}
              >
                <ImageBackground
                  source={{ uri: item.images?.[0] }}
                  style={styles.cardImage}
                  imageStyle={{ borderTopLeftRadius: 18, borderTopRightRadius: 18 }}
                >
                  <LinearGradient colors={['transparent', 'rgba(10,10,15,0.8)']} style={StyleSheet.absoluteFill} />
                  <TouchableOpacity style={styles.heartBtn}>
                    <Icon name="heart" size={14} color={colors.goldEnd} />
                  </TouchableOpacity>
                </ImageBackground>
                <View style={styles.cardInfo}>
                  <View style={styles.cardInfoTop}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <Text style={styles.cardPrice}>
                      ₦{formatNaira(item.pricePerNight)}
                      <Text style={styles.perNight}>/night</Text>
                    </Text>
                  </View>
                  <View style={styles.cardMeta}>
                    <Icon name="location-dot" size={11} color={colors.goldMid} />
                    <Text style={styles.cardMetaText}>{item.city}</Text>
                    <Icon name="bed" size={11} color={colors.goldEnd} />
                    <Text style={styles.cardMetaText}>{item.bedrooms} bed{item.bedrooms !== 1 ? 's' : ''}</Text>
                    <Icon name="users" size={11} color={colors.goldEnd} />
                    <Text style={styles.cardMetaText}>{item.maxGuests}</Text>
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
  tabRow: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 16 },
  tabActive: { paddingHorizontal: 20, paddingVertical: 9, backgroundColor: colors.goldEnd, borderRadius: 20 },
  tabActiveText: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#0A0A0F' },
  list: { paddingHorizontal: 24, gap: 14, paddingBottom: 32 },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 18, overflow: 'hidden',
    ...shadows.card,
  },
  cardImage: { height: 180, justifyContent: 'flex-start', alignItems: 'flex-end', padding: 14 },
  heartBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(10,10,15,0.7)',
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { padding: 14, gap: 6 },
  cardInfoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 15, color: colors.textPrimary, flex: 1 },
  cardPrice: { fontFamily: 'Inter-Bold', fontSize: 15, color: colors.goldEnd },
  perNight: { fontFamily: 'Inter-Regular', fontSize: 10, color: colors.textMuted },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardMetaText: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted },
});
