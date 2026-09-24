import React, { useCallback, useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreenNative from 'expo-splash-screen';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PaystackProvider } from './src/paystack/PaystackProvider';

// Keep the native splash screen up until fonts are ready — avoids a flash
// of system-font UI before Playfair Display / Inter kick in.
SplashScreenNative.preventAutoHideAsync();

// .env defines EXPO_PUBLIC_PAYSTACK_KEY (pk_test_… or pk_live_…). Reading a
// differently-named variable here silently yields '' — and because the library
// does not validate publicKey, checkout would still open a modal that renders
// blank and never fires a callback. PaymentScreen guards on the same value so a
// missing key reports itself instead of failing silently.
const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_KEY || '';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'PlayfairDisplay-Regular': PlayfairDisplay_400Regular,
    'PlayfairDisplay-SemiBold': PlayfairDisplay_600SemiBold,
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    'PlayfairDisplay-Black': PlayfairDisplay_900Black,
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreenNative.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <PaystackProvider publicKey={PAYSTACK_PUBLIC_KEY} defaultChannels={['card', 'bank_transfer', 'ussd']}>
          <RootNavigator />
        </PaystackProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
