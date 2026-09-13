import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarlightBackground from '../../components/StarlightBackground';

export default function EmergencySOSScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <StarlightBackground />

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle-outline" size={64} color="#ff4444" />
        </View>
        <Text style={styles.title}>Emergency SOS</Text>
        <Text style={styles.subtitle}>Coming Soon</Text>
        <Text style={styles.description}>
          One-tap emergency contact and location sharing for venue safety
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backButton: {
    position: 'absolute', top: 54, left: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center',
  },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  iconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,68,68,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#f5dd4b', fontSize: 18, marginBottom: 12 },
  description: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});