import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { useStore } from '../../store/useStore';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

const APP_NAME = process.env.EXPO_PUBLIC_APP_NAME || 'Zentra';
const APP_VERSION = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';

const initialsOf = (firstName?: string, lastName?: string, email?: string): string => {
  const initials = `${firstName?.trim()?.[0] ?? ''}${lastName?.trim()?.[0] ?? ''}`.toUpperCase();
  if (initials) return initials;
  return (email?.trim()?.[0] ?? '?').toUpperCase();
};

export const ProfileScreen = ({ navigation }: any) => {
  const user = useStore((s) => s.user);
  const walletBalance = useStore((s) => s.walletBalance);
  const logout = useStore((s) => s.logout);

  // logout() flips isAuthenticated, and RootNavigator swaps to the Auth stack on
  // its own — no navigation call here, and doing both would race the unmount.
  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'You will need to sign in again to view your bookings and wallet.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout },
      ],
    );
  };

  const rows = [
    { key: 'bookings', icon: 'calendar-check', label: 'My Bookings', route: 'MyBookings' },
    { key: 'wallet', icon: 'wallet', label: 'Wallet', route: 'Wallet' },
    { key: 'notifications', icon: 'bell', label: 'Notifications', route: 'Notifications' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <Text style={styles.pageTitle}>{APP_NAME}</Text>

          {/* Identity — initials rather than a remote avatar. AuthUser carries an
              optional avatarUrl, but nothing in the app ever uploads one, so a
              broken image placeholder would be the common case. */}
          <View style={styles.identityCard}>
            <LinearGradient colors={[colors.goldStart, colors.goldEnd]} style={styles.avatar}>
              <Text style={styles.avatarText}>
                {initialsOf(user?.firstName, user?.lastName, user?.email)}
              </Text>
            </LinearGradient>

            <View style={styles.identityInfo}>
              <Text style={styles.identityName} numberOfLines={1}>
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Guest'}
              </Text>
              {user?.email ? (
                <View style={styles.identityRow}>
                  <Icon name="envelope" size={10} color={colors.textMuted} />
                  <Text style={styles.identityDetail} numberOfLines={1}>{user.email}</Text>
                </View>
              ) : null}
              {user?.phone ? (
                <View style={styles.identityRow}>
                  <Icon name="phone" size={10} color={colors.textMuted} />
                  <Text style={styles.identityDetail} numberOfLines={1}>{user.phone}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.group}>
            {rows.map((row) => (
              <TouchableOpacity
                key={row.key}
                style={styles.rowBtn}
                onPress={() => navigation.navigate(row.route)}
                activeOpacity={0.7}
              >
                <View style={styles.rowIconWrap}>
                  <Icon name={row.icon} size={14} color={colors.goldEnd} />
                </View>
                <Text style={styles.rowLabel}>{row.label}</Text>

                {/* Only shown once the balance has actually been fetched:
                    walletBalance is null until then, and rendering ₦0 for
                    "never loaded" would be a lie about the account. */}
                {row.key === 'wallet' && walletBalance !== null && (
                  <Text style={styles.rowValue}>₦{formatNaira(walletBalance)}</Text>
                )}

                <Icon name="chevron-right" size={12} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.group}>
            <View style={styles.staticRow}>
              <View style={styles.rowIconWrap}>
                <Icon name="circle-info" size={14} color={colors.textMuted} />
              </View>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowValueMuted}>{APP_VERSION}</Text>
            </View>
          </View>

          {/* Deliberately no toggles. .env sets both EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH
              and EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS to false, and neither
              expo-local-authentication nor expo-notifications is installed — a row
              here would be a switch wired to nothing. Omitted rather than rendered
              disabled, because disabled reads as "coming soon".
              Same reasoning drops edit-profile, delete-account, Terms and Privacy:
              no endpoints and no URLs exist for them. This screen still absorbs
              what SettingsScreen used to cover, per the ProfileStack note. */}

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Icon name="arrow-right-from-bracket" size={14} color="#F87171" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 40 },
  pageTitle: {
    fontFamily: 'PlayfairDisplay-Bold', fontSize: 24, color: colors.textPrimary,
    marginBottom: 20, letterSpacing: 1,
  },
  identityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 20, padding: 18, marginBottom: 22,
    ...shadows.card,
  },
  avatar: {
    width: 62, height: 62, borderRadius: 31,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.goldGlow,
  },
  avatarText: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: '#0A0A0F' },
  identityInfo: { flex: 1, gap: 4 },
  identityName: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 19, color: colors.textPrimary },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  identityDetail: {
    flex: 1, fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted,
  },
  group: {
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 18, overflow: 'hidden', marginBottom: 16,
  },
  rowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  staticRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 16, paddingVertical: 16,
  },
  rowIconWrap: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: 'rgba(201,151,42,0.10)',
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 14, color: colors.textPrimary },
  rowValue: { fontFamily: 'Inter-Bold', fontSize: 13, color: colors.goldEnd, marginRight: 8 },
  rowValueMuted: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textMuted },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.30)',
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  logoutText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#F87171' },
});
