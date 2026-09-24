import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MyBookingsScreen } from '../screens/bookings/MyBookingsScreen';
import { BookingConfirmationScreen } from '../screens/bookings/BookingConfirmationScreen';
import { PaymentScreen } from '../screens/payments/PaymentScreen';
import { QueueStatusScreen } from '../screens/queue/QueueScreen';
import { TableOrderScreen } from '../screens/orders/OrderScreen';
import { TicketScreen } from '../screens/tickets/TicketScreen';

const Stack = createNativeStackNavigator();

export const BookingsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
    <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
    {/* No swipe-back: an accidental dismissal mid-charge is unrecoverable. */}
    <Stack.Screen
      name="Payment"
      component={PaymentScreen}
      options={{ gestureEnabled: false }}
    />
    <Stack.Screen name="QueueStatus" component={QueueStatusScreen} />
    <Stack.Screen name="TableOrder" component={TableOrderScreen} />
    <Stack.Screen name="Ticket" component={TicketScreen} />
  </Stack.Navigator>
);