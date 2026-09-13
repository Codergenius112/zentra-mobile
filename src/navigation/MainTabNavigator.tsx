import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { HomeStack } from './HomeStack';
import { ExploreStack } from './ExploreStack';
import { ItineraryStack } from './ItineraryStack';
import { BookingsStack } from './BookingsStack';
import { ProfileStack } from './ProfileStack';
import { colors } from '../theme/colors';

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
