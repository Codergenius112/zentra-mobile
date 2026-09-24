import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { NotificationsScreen } from '../screens/Notifications/NotificationsScreen';
import { WalletScreen } from '../screens/wallet/WalletScreen';
import { MyBookingsScreen } from '../screens/bookings/MyBookingsScreen';
import { BookingConfirmationScreen } from '../screens/bookings/BookingConfirmationScreen';
import { PaymentScreen } from '../screens/payments/PaymentScreen';
import { TableOrderScreen } from '../screens/orders/OrderScreen';
import { TicketScreen } from '../screens/tickets/TicketScreen';

const Stack = createNativeStackNavigator();

// ProfileScreen absorbs what SettingsScreen used to cover — no separate Settings route.
export const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Wallet" component={WalletScreen} />
    <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
    <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
    {/* No swipe-back: an accidental dismissal mid-charge is unrecoverable. */}
    <Stack.Screen
      name="Payment"
      component={PaymentScreen}
      options={{ gestureEnabled: false }}
    />
    <Stack.Screen name="TableOrder" component={TableOrderScreen} />
    <Stack.Screen name="Ticket" component={TicketScreen} />
  </Stack.Navigator>
);