import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

type BadgeVariant = 'confirmed' | 'upcoming' | 'active' | 'capacity' | 'cancelled';

interface BadgePillProps {
  label: string;
  variant: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, { bg: string; border: string; text: string }> = {
  confirmed: { bg: 'rgba(46,204,113,0.15)', border: 'rgba(46,204,113,0.35)', text: colors.success },
  upcoming:  { bg: 'rgba(201,151,42,0.15)', border: 'rgba(201,151,42,0.35)', text: colors.goldEnd },
  active:    { bg: 'rgba(74,158,255,0.15)', border: 'rgba(74,158,255,0.35)', text: colors.active },
  capacity:  { bg: 'rgba(255,148,66,0.15)', border: 'rgba(255,148,66,0.35)', text: '#FFAB40' },
  cancelled: { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.28)',  text: '#F87171' },
};

export const BadgePill: React.FC<BadgePillProps> = ({ label, variant }) => {
  const s = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.label, { color: s.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
