import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { PaystackProvider } from '../paystack/PaystackProvider';
import { HomeStack } from './HomeStack';
import { ExploreStack } from './ExploreStack';
import { ItineraryStack } from './ItineraryStack';
import { BookingsStack } from './BookingsStack';
import { ProfileStack } from './ProfileStack';
import { colors } from '../theme/colors';

// .env defines EXPO_PUBLIC_PAYSTACK_KEY (pk_test_… or pk_live_…). Reading a
// differently-named variable here silently yields '' — and because the library
// does not validate publicKey, checkout would still open a modal that renders
// blank and never fires a callback. PaymentScreen guards on the same value so a
// missing key reports itself instead of failing silently.
const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_KEY || '';

// Scoped here rather than at the App.tsx root. This is the project's own
// PaystackProvider (src/paystack/PaystackProvider.tsx) — it deliberately
// mounts a WebView for the app's entire lifetime and preloads Paystack's
// inline.js at boot, to kill checkout's cold-start lag (see the comment block
// at the top of that file). That permanently-live WebView — actively loading
// a remote script, not just sitting empty — is a known cause of the native
// keyboard randomly losing/regaining focus on unrelated TextInputs elsewhere
// in the app. Scoping it here keeps it out of the Auth stack entirely
// (Login/SignUp/ForgotPassword), so that WebView doesn't exist until someone
// is actually logged in — it starts warming up right after login instead of
// from app boot, which is a fine trade-off since no one pays within their
// first second in the app anyway.

const Tab = createBottomTabNavigator();

const CustomTabBar = ({ state, descriptors, navigation }: any) => {
  const tabs = [
    { name: 'HomeTab',      label: 'Home',     icon: 'house' },
    { name: 'ExploreTab',   label: 'Explore',  icon: 'compass' },
    { name: 'NightTab',     label: 'Itinerary', icon: 'route', center: true },
    { name: 'BookingsTab',  label: 'Bookings', icon: 'calendar-check' },
    { name: 'ProfileTab',   label: 'Profile',  icon: 'user' },
  ];

  return (
    <View style={styles.tabBar}>
      {state.routes.map((route: any, index: number) => {
        const tab = tabs[index];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        if (tab.center) {
          return (
            <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabItem}>
              <LinearGradient
                colors={[colors.goldStart, colors.goldEnd]}
                style={styles.centerBtn}
              >
                <Icon name="route" size={18} color="#0A0A0F" />
              </LinearGradient>
              <Text style={styles.tabLabel}>Itinerary</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabItem} activeOpacity={0.7}>
            <Icon
              name={tab.icon}
              size={20}
              color={isFocused ? colors.goldEnd : colors.textMuted}
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {isFocused && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export const MainTabNavigator = () => (
  <PaystackProvider publicKey={PAYSTACK_PUBLIC_KEY} defaultChannels={['card', 'bank_transfer', 'ussd']}>
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} />
      <Tab.Screen name="ExploreTab" component={ExploreStack} />
      <Tab.Screen name="NightTab" component={ItineraryStack} />
      <Tab.Screen name="BookingsTab" component={BookingsStack} />
      <Tab.Screen name="ProfileTab" component={ProfileStack} />
    </Tab.Navigator>
  </PaystackProvider>
);

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    borderTopWidth: 1,
    borderTopColor: colors.borderGold,
    paddingBottom: 28,
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  centerBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    shadowColor: colors.goldStart,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  tabLabel: { fontFamily: 'Inter-Medium', fontSize: 10, color: colors.textMuted },
  tabLabelActive: { color: colors.goldEnd, fontFamily: 'Inter-SemiBold' },
  activeDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: colors.goldEnd,
    marginTop: 2,
  },
});