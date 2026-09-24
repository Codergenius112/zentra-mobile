import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExploreHubScreen } from '../screens/explore/ExploreHubScreen';

// Events
import { EventsListScreen } from '../screens/events/EventsListScreen';
import { EventDetailScreen } from '../screens/events/EventDetailsScreen';
import { SelectTableScreen } from '../screens/events/SelectTablesScreen';

// Venues
import { VenuesListScreen } from '../screens/venues/VenuesListScreen';
import { VenueDetailScreen } from '../screens/venues/VenuesDetailsScreen';
import { SelectVenueTableScreen } from '../screens/venues/SelectTablesScreen';

// Stays
import { StaysScreen } from '../screens/apartments/ApartmentScreen';
import { ApartmentDetailScreen } from '../screens/apartments/ApartmentDetailsScreen';

// Rides
import { RidesScreen } from '../screens/Rides/RidesScreen';
import { RideDetailScreen } from '../screens/Rides/RideDetailScreen';
import { JetsScreen } from '../screens/Jets/JetsScreen';

// Shared checkout / booking flow — needed regardless of which category
// (event ticket, event table, venue table, stay, or ride) the person started from.
import { PaymentScreen } from '../screens/payments/PaymentScreen';
import { GroupBookingScreen } from '../screens/bookings/GroupBookingScreen';
import { BookingConfirmationScreen } from '../screens/bookings/BookingConfirmationScreen';
import { MyBookingsScreen } from '../screens/bookings/MyBookingsScreen';
import { TableOrderScreen } from '../screens/orders/OrderScreen';
import { QueueStatusScreen } from '../screens/queue/QueueScreen';
import { NotificationsScreen } from '../screens/Notifications/NotificationsScreen';
import { TicketScreen } from '../screens/tickets/TicketScreen';

const Stack = createNativeStackNavigator();

// "Explore" tab — ExploreHubScreen is the landing page with all four
// bookable categories (Events, Venues, Stays, Rides). Event tables and venue
// tables stay on their own separate routes ("SelectTable" vs
// "SelectVenueTable") since they pull from different backend endpoints
// (GET /tables/event/:id vs GET /tables/venue/:id) — the hub routes into
// the correct one depending on which category the person picked, it never
// merges them into a single screen.
export const ExploreStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ExploreHub" component={ExploreHubScreen} />

    {/* Events -> tickets + event-scoped tables */}
    <Stack.Screen name="EventsList" component={EventsListScreen} />
    <Stack.Screen name="EventDetail" component={EventDetailScreen} />
    <Stack.Screen name="SelectTable" component={SelectTableScreen} />

    {/* Venues -> venue-scoped tables */}
    <Stack.Screen name="VenuesList" component={VenuesListScreen} />
    <Stack.Screen name="VenueDetail" component={VenueDetailScreen} />
    <Stack.Screen name="SelectVenueTable" component={SelectVenueTableScreen} />

    {/* Stays */}
    <Stack.Screen name="Stays" component={StaysScreen} />
    <Stack.Screen name="ApartmentDetail" component={ApartmentDetailScreen} />

    {/* Rides */}
    <Stack.Screen name="Rides" component={RidesScreen} />
    <Stack.Screen name="RideDetail" component={RideDetailScreen} />
    <Stack.Screen name="Jets" component={JetsScreen} />

    {/* Shared checkout / booking flow */}
    {/* No swipe-back: an accidental dismissal mid-charge is unrecoverable. */}
    <Stack.Screen
      name="Payment"
      component={PaymentScreen}
      options={{ gestureEnabled: false }}
    />
    <Stack.Screen name="GroupBooking" component={GroupBookingScreen} />
    <Stack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
    <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
    <Stack.Screen name="TableOrder" component={TableOrderScreen} />
    <Stack.Screen name="Ticket" component={TicketScreen} />
    <Stack.Screen name="QueueStatus" component={QueueStatusScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);