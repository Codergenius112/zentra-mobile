import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { name: 'HomeTab', icon: 'house', label: 'Home' },
  { name: 'ExploreTab', icon: 'compass', label: 'Explore' },
  { name: 'ActivitiesTab', icon: 'list-check', label: 'Activities', isCenter: true },
  { name: 'BookingsTab', icon: 'calendar-check', label: 'Bookings' },
  { name: 'ProfileTab', icon: 'user', label: 'Profile' },
];

export default function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
      {TABS.map((tab, index) => {
        const isFocused = state.index === index;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: state.routes[index].key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(state.routes[index].name);
          }
        };

        if (tab.isCenter) {
          return (
            <TouchableOpacity key={tab.name} onPress={onPress} style={styles.tabItem}>
              <LinearGradient
                colors={['#C9972A', '#F5C842']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.centerBadge}
              >
                <FontAwesome6 name={tab.icon} size={17} color="#0A0A0F" solid />
              </LinearGradient>
              <Text style={[styles.label, { color: isFocused ? '#E0AD36' : 'rgba(255,255,255,0.32)' }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={tab.name} onPress={onPress} style={styles.tabItem}>
            <FontAwesome6 name={tab.icon} size={19} color={isFocused ? '#E0AD36' : 'rgba(255,255,255,0.32)'} solid />
            <Text style={[styles.label, { fontWeight: isFocused ? '600' : '500', color: isFocused ? '#E0AD36' : 'rgba(255,255,255,0.32)' }]}>
              {tab.label}
            </Text>
            {isFocused && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#141420',
    borderTopWidth: 1,
    borderTopColor: 'rgba(201,151,42,0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  centerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#C9972A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  label: { fontSize: 10, marginTop: 3 },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#E0AD36', marginTop: 3 },
});
