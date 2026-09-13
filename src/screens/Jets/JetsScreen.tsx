import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { GoldButton } from '../../components/GoldButton';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';

const features = [
  { icon: 'plane',      label: 'Charter Flights' },
  { icon: 'users',      label: 'Group Jets' },
  { icon: 'helicopter', label: 'Helicopter' },
];

export const JetsScreen = ({ navigation }: any) => {
  const [phone, setPhone] = useState('');

  const handleNotify = () => {
    if (!phone) return;
    // No backend waitlist endpoint exists yet — this is a local confirmation
    // only, the number isn't actually persisted anywhere. Wire this up to a
    // real endpoint once one exists if you want to actually collect these.
    Alert.alert('You\'re on the list!', 'We\'ll notify you when Jets launches.');
    setPhone('');
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A', '#050510']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Icon name="plane" size={16} color={colors.goldEnd} />
            <Text style={styles.title}>Private Jets</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={styles.iconWrap}>
            <LinearGradient colors={[colors.goldStart, colors.goldEnd]} style={styles.iconGrad}>
              <Text style={styles.iconStar}>✦</Text>
            </LinearGradient>
          </View>
          <Text style={styles.comingSoon}>COMING SOON</Text>
          <Text style={styles.headline}>Private jet booking{'\n'}is landing soon.</Text>
          <Text style={styles.subtext}>Be the first to know when we go live.</Text>
          <Text style={styles.launchDate}>Coming Soon</Text>
        </View>

        {/* Notify Me */}
        <View style={styles.notifyCard}>
          <Text style={styles.notifyLabel}>Get Notified at Launch</Text>
          <View style={styles.notifyRow}>
            <View style={styles.phoneInput}>
              <Icon name="phone" size={13} color={colors.textMuted} />
              <TextInput
                style={styles.phoneInputText}
                placeholder="Your phone number"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
            <TouchableOpacity onPress={handleNotify} style={styles.notifyBtn}>
              <LinearGradient colors={[colors.goldStart, colors.goldEnd]} style={styles.notifyBtnGrad}>
                <Text style={styles.notifyBtnText}>Notify Me</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Feature Previews */}
        <View style={styles.featuresRow}>
          {features.map(({ icon, label }) => (
            <View key={label} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Icon name={icon} size={20} color={colors.goldEnd} />
              </View>
              <Text style={styles.featureName}>{label}</Text>
              <View style={styles.soonBadge}>
                <Text style={styles.soonText}>Soon</Text>
              </View>
            </View>
          ))}
        </View>
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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: colors.textPrimary },
  heroSection: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  iconWrap: { marginBottom: 8 },
  iconGrad: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', ...shadows.goldGlowLg },
  iconStar: { fontSize: 38, color: '#0A0A0F' },
  comingSoon: {
    fontFamily: 'Inter-Bold', fontSize: 12, color: colors.goldEnd,
    letterSpacing: 3, textTransform: 'uppercase',
  },
  headline: {
    fontFamily: 'PlayfairDisplay-Bold', fontSize: 28, color: colors.textPrimary,
    textAlign: 'center', lineHeight: 36,
  },
  subtext: { fontFamily: 'Inter-Regular', fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  launchDate: {
    fontFamily: 'Inter-SemiBold', fontSize: 12, color: 'rgba(201,151,42,0.6)',
    marginTop: 4,
  },
  notifyCard: {
    backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 18, padding: 18, marginHorizontal: 24, marginBottom: 20, gap: 12,
  },
  notifyLabel: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textSecondary },
  notifyRow: { flexDirection: 'row', gap: 10 },
  phoneInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 12, paddingHorizontal: 14, height: 48,
  },
  phoneInputText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textPrimary },
  notifyBtn: { borderRadius: 12, overflow: 'hidden' },
  notifyBtnGrad: { height: 48, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  notifyBtnText: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#0A0A0F' },
  featuresRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 10, paddingBottom: 32 },
  featureCard: {
    flex: 1, backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 16, padding: 14, alignItems: 'center', gap: 8,
  },
  featureIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(201,151,42,0.1)',
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  featureName: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  soonBadge: {
    backgroundColor: 'rgba(201,151,42,0.1)',
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  soonText: { fontFamily: 'Inter-SemiBold', fontSize: 9, color: colors.goldEnd },
});
