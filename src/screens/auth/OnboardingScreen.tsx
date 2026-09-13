import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, Dimensions,
  TouchableOpacity, Animated, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'One App.\nUnlimited\nExperiences.',
    subtitle: 'Events, tables, stays, rides and more. All in one place.',
    image: require('../../assets/images/skyline_saturdays_hero.jpg'),
  },
  {
    id: '2',
    title: 'Book Tables.\nSkip the Queue.',
    subtitle: 'Reserve VIP tables at the best venues and events. Split the cost with your crew.',
    image: require('../../assets/images/eclipse_nightclub_dark_moody_indigo_purple_vip_tables_lagos.jpg'),
  },
  {
    id: '3',
    title: 'Your Night.\nYour Way.',
    subtitle: 'Book VIP tables, jump the queue and enjoy premium privileges.',
    image: require('../../assets/images/marquee_club_high_energy_nightclub_vip_sparklers_lagos_premium.jpg'),
  },
  {
    id: '4',
    title: 'Elevate\nEvery Night.',
    subtitle: 'Your personal concierge for unforgettable Lagos nights. Let\'s begin.',
    image: require('../../assets/images/luxury_rooftop_bar_nightscape_city_lights_bokeh.jpg'),
  },
];

export const OnboardingScreen = ({ navigation }: any) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('Login');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <ImageBackground source={item.image} style={StyleSheet.absoluteFill} resizeMode="cover">
              <LinearGradient
                colors={['rgba(10,10,15,0.25)', 'rgba(10,10,15,0.55)', 'rgba(10,10,15,0.95)']}
                style={StyleSheet.absoluteFill}
              />
            </ImageBackground>
            <View style={styles.slideContent}>
              <Text style={styles.headline}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.bottomNav}>
        <TouchableOpacity onPress={() => navigation.replace('Login')}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>

        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {currentIndex === slides.length - 1 ? (
          <TouchableOpacity onPress={onNext}>
            <LinearGradient
              colors={[colors.goldStart, colors.goldEnd]}
              style={styles.getStartedBtn}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onNext}>
            <LinearGradient
              colors={[colors.goldStart, colors.goldEnd]}
              style={styles.arrowBtn}
            >
              <Text style={styles.arrowText}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  slide: { width, flex: 1 },
  slideContent: {
    position: 'absolute',
    bottom: 120,
    left: 32,
    right: 32,
    gap: 16,
  },
  headline: {
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: 42,
    color: colors.textPrimary,
    lineHeight: 50,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: 56,
    paddingTop: 16,
  },
  skip: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textMuted },
  dots: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.22)' },
  dotActive: { width: 22, borderRadius: 3, backgroundColor: colors.goldEnd },
  arrowBtn: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 22, color: '#0A0A0F', fontWeight: '700' },
  getStartedBtn: { height: 54, paddingHorizontal: 24, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  getStartedText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#0A0A0F', fontWeight: '700' },
});
