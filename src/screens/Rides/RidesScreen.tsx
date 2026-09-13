import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { carsAPI, CarListing } from '../../services/api';
import { SkeletonCard } from '../../components/SkeletonCard';
import { ErrorState } from '../../components/ErrorState';
import { EmptyState } from '../../components/EmptyState';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

export const RidesScreen = ({ navigation }: any) => {
  const [cars, setCars] = useState<CarListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await carsAPI.getListings();
      setCars(res.listings ?? []);
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
          <Text style={styles.title}>Rides</Text>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.tabRow}>
          <View style={styles.tabActive}>
            <Text style={styles.tabActiveText}>Cars</Text>
          </View>
          <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('Jets')}>
            <Text style={styles.tabText}>Jets</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 24, gap: 14 }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} height={200} />)}
          </View>
        ) : hasError ? (
          <ErrorState
            title="Couldn't load rides"
            subtitle="Something went wrong. Tap to retry."
            onRetry={load}
            fullScreen
          />
        ) : cars.length === 0 ? (
          <EmptyState icon="car" title="No cars available" subtitle="Check back soon for new listings." />
        ) : (
          <FlatList
            data={cars}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('RideDetail', { rideId: item.id })}
                activeOpacity={0.9}
              >
                <ImageBackground
                  source={{ uri: item.images?.[0] }}
                  style={styles.cardImage}
                  imageStyle={{ borderTopLeftRadius: 18, borderTopRightRadius: 18 }}
                >
                  <LinearGradient colors={['transparent', 'rgba(10,10,15,0.85)']} style={StyleSheet.absoluteFill} />
                  <TouchableOpacity style={styles.heartBtn}>
                    <Icon name="heart" size={14} color={colors.goldEnd} />
                  </TouchableOpacity>
                </ImageBackground>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardName}>{item.make} {item.model}</Text>
                    <Text style={styles.cardPrice}>
                      ₦{formatNaira(item.pricePerDay)}
                      <Text style={styles.perDay}>/day</Text>
                    </Text>
                  </View>
                  <View style={styles.cardMeta}>
                    {[
                      { icon: 'user-group', text: `${item.seats} Seats` },
                      { icon: 'gear',       text: item.transmission },
                      { icon: 'id-card',    text: item.withDriver ? 'Chauffeur-Driven' : 'Self-Drive' },
                    ].map(({ icon, text }) => (
                      <View key={text} style={styles.metaChip}>
                        <Icon name={icon} size={10} color={colors.goldMid} />
                        <Text style={styles.metaText}>{text}</Text>
                      </View>
                    ))}
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
  tabRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, marginBottom: 16 },
  tabActive: { paddingHorizontal: 20, paddingVertical: 9, backgroundColor: colors.goldEnd, borderRadius: 20 },
  tabActiveText: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#0A0A0F' },
  tab: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: colors.borderGold },
  tabText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textSecondary },
  list: { paddingHorizontal: 24, gap: 14, paddingBottom: 32 },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 18, overflow: 'hidden', ...shadows.card,
  },
  cardImage: { height: 160, justifyContent: 'flex-start', alignItems: 'flex-end', padding: 14 },
  heartBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(10,10,15,0.7)',
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 16, color: colors.textPrimary },
  cardPrice: { fontFamily: 'Inter-Bold', fontSize: 15, color: colors.goldEnd },
  perDay: { fontFamily: 'Inter-Regular', fontSize: 10, color: colors.textMuted },
  cardMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  metaText: { fontFamily: 'Inter-Regular', fontSize: 10, color: colors.textSecondary },
});
