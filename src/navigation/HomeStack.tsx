import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/home/HomeScreen';
import { NotificationsScreen } from '../screens/Notifications/NotificationsScreen';
import { EventDetailScreen } from '../screens/events/EventDetailsScreen';
import { EventsListScreen } from '../screens/events/EventsListScreen';
import { SelectTableScreen } from '../screens/events/SelectTablesScreen';
import { GroupBookingScreen } from '../screens/bookings/GroupBookingScreen';
import { PaymentScreen } from '../screens/payments/PaymentScreen';
import { VenuesListScreen } from '../screens/venues/VenuesListScreen';
import { VenueDetailScreen } from '../screens/venues/VenuesDetailsScreen';
import { SelectVenueTableScreen } from '../screens/venues/SelectTablesScreen';
import { StaysScreen } from '../screens/apartments/ApartmentScreen';
import { ApartmentDetailScreen } from '../screens/apartments/ApartmentDetailsScreen';
import { RidesScreen } from '../screens/Rides/RidesScreen';
import { RideDetailScreen } from '../screens/Rides/RideDetailScreen';
import { JetsScreen } from '../screens/Jets/JetsScreen';
import { BookingConfirmationScreen } from '../screens/bookings/BookingConfirmationScreen';
import { MyBookingsScreen } from '../screens/bookings/MyBookingsScreen';
import { TableOrderScreen } from '../screens/orders/OrderScreen';
import { QueueStatusScreen } from '../screens/queue/QueueScreen';
import { TicketScreen } from '../screens/tickets/TicketScreen';

const Stack = createNativeStackNavigator();

export const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="EventDetail" component={EventDetailScreen} />
    <Stack.Screen name="EventsList" component={EventsListScreen} />
    <Stack.Screen name="SelectTable" component={SelectTableScreen} />
    <Stack.Screen name="GroupBooking" component={GroupBookingScreen} />
    {/* No swipe-back: an accidental dismissal mid-charge is unrecoverable. */}
    <Stack.Screen
      name="Payment"
      component={PaymentScreen}
      options={{ gestureEnabled: false }}
    />
    <Stack.Screen name="VenuesList" component={VenuesListScreen} />
    <Stack.Screen name="VenueDetail" component={VenueDetailScreen} />
    <Stack.Screen name="SelectVenueTable" component={SelectVenueTableScreen} />
    <Stack.Screen name="Stays" component={StaysScreen} />
    <Stack.Screen name="ApartmentDetail" component={ApartmentDetailScreen} />
    <Stack.Screen name="Rides" component={RidesScreen} />
    <Stack.Screen name="RideDetail" component={RideDetailScreen} />
    <Stack.Screen name="Jets" component={JetsScreen} />
    <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
    <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
    <Stack.Screen name="TableOrder" component={TableOrderScreen} />
    <Stack.Screen name="Ticket" component={TicketScreen} />
    <Stack.Screen name="QueueStatus" component={QueueStatusScreen} />
  </Stack.Navigator>
);