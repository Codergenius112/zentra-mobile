import React from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { shadows } from '../theme/shadows';

interface GoldButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'dashed';
  style?: ViewStyle;
}

export const GoldButton: React.FC<GoldButtonProps> = ({
  title, onPress, loading, disabled, variant = 'primary', style,
}) => {
  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        style={style}
      >
        <LinearGradient
          colors={[colors.goldStart, colors.goldEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.primary, disabled && styles.disabled]}
        >
          {loading
            ? <ActivityIndicator color="#0A0A0F" />
            : <Text style={styles.primaryText}>{title}</Text>
          }
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={[styles.secondary, style]}
      >
        <Text style={styles.secondaryText}>{title}</Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'dashed') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={[styles.dashed, style]}
      >
        <Text style={styles.secondaryText}>{title}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.ghost, style]}
    >
      <Text style={styles.ghostText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  primary: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.goldGlow,
  },
  primaryText: {
    fontFamily: 'Inter-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#0A0A0F',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  disabled: { opacity: 0.55 },
  secondary: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.goldMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    color: colors.goldEnd,
    letterSpacing: 0.5,
  },
  dashed: {
    height: 52,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.goldMid,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: colors.textSecondary,
  },
});
