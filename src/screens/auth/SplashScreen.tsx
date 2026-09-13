import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';

const { width, height } = Dimensions.get('window');

export const SplashScreen = ({ navigation }: any) => {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace('Onboarding'), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/luxury_rooftop_bar_nightscape_city_lights_bokeh.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(10,10,15,0.85)', 'rgba(10,10,15,0.55)', 'rgba(10,10,15,0.85)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={styles.starIcon}>
          <LinearGradient colors={[colors.goldStart, colors.goldEnd]} style={styles.starGradient}>
            <Text style={styles.starText}>✦</Text>
          </LinearGradient>
        </View>
        <Text style={styles.headline}>Elevate Every Experience</Text>
        <Text style={styles.subtitle}>Your night. Your way. All in one place.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  starIcon: { marginBottom: 8 },
  starGradient: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  starText: { fontSize: 36, color: '#0A0A0F' },
  headline: {
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: 26,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
