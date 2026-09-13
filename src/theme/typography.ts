import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const typography = StyleSheet.create({
  display: {
    fontFamily: 'PlayfairDisplay-Black',
    fontSize: 38,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  h1: {
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: 29,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  h2: {
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: 19,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  h3: {
    fontFamily: 'PlayfairDisplay-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  caption: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.textMuted,
  },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
});
