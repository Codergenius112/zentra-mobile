import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ItineraryScreen } from '../screens/itinerary/ItineraryScreen';
import { QueueStatusScreen } from '../screens/queue/QueueScreen';

const Stack = createNativeStackNavigator();

// "My Night" tab — the itinerary screen owns its own empty / active / complete states internally.
export const ItineraryStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Itinerary" component={ItineraryScreen} />
    <Stack.Screen name="QueueStatus" component={QueueStatusScreen} />
  </Stack.Navigator>
);
