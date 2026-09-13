import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { GoldButton } from './GoldButton';
import { colors } from '../theme/colors';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon, title, subtitle, ctaLabel, onCta,
}) => (
  <View style={styles.container}>
    <View style={styles.iconWrap}>
      <Icon name={icon} size={36} color={colors.goldMid} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    {ctaLabel && onCta && (
      <GoldButton title={ctaLabel} onPress={onCta} style={styles.btn} />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 14 },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 8, width: '100%' },
});
