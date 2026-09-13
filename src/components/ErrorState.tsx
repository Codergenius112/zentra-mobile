import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { GoldButton } from './GoldButton';
import { colors } from '../theme/colors';

interface ErrorStateProps {
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  subtitle = 'We couldn\'t load this content. Tap to retry.',
  onRetry,
  fullScreen,
}) => (
  <View style={[styles.container, fullScreen && styles.fullScreen]}>
    <View style={styles.iconWrap}>
      <Icon name="wifi" size={32} color={colors.goldMid} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    {onRetry && (
      <GoldButton
        title="Try Again"
        onPress={onRetry}
        style={styles.btn}
      />
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 32, gap: 12 },
  fullScreen: { flex: 1, justifyContent: 'center' },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  btn: { marginTop: 8, width: 200 },
});
