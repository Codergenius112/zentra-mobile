import React, { forwardRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface GoldInputProps extends TextInputProps {
  iconName?: string;
  isPassword?: boolean;
}

export const GoldInput = forwardRef<TextInput, GoldInputProps>(({
  iconName, isPassword, style, onFocus, onBlur, ...props
}, ref) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus: TextInputProps['onFocus'] = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur: TextInputProps['onBlur'] = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[
      styles.container,
      // focused && styles.focused,
      style as any,
    ]}>
      {iconName && (
        <Icon name={iconName} size={16} color={colors.textMuted} style={styles.icon} />
      )}
      <TextInput
        ref={ref}
        style={styles.input}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={isPassword && !showPassword}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      {isPassword && (
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Icon
            name={showPassword ? 'eye-slash' : 'eye'}
            size={16}
            color={colors.textMuted}
          />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 15,
    paddingHorizontal: 16,
    height: 54,
    gap: 10,
  },
  focused: {
    borderColor: colors.goldMid,
    shadowColor: colors.goldStart,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.textPrimary,
  },
});