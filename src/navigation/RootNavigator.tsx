import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useStore } from '../store/useStore';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const hasHydrated = useStore((s) => s.hasHydrated);

  // Without this gate a signed-in user mounts the Auth stack on cold start and
  // gets swapped to Main mid-way through SplashScreen's entrance animation, once
  // AsyncStorage rehydration flips isAuthenticated.
  if (!hasHydrated) {
    return (
      <View style={styles.gate}>
        <Text style={styles.gateWordmark}>ZENTRA</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  gate: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gateWordmark: {
    fontFamily: 'PlayfairDisplay-Black',
    fontSize: 22,
    letterSpacing: 6,
    color: colors.goldEnd,
  },
});
