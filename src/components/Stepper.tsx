import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({
  value, min = 0, max = 10, onChange,
}) => (
  <View style={styles.container}>
    <TouchableOpacity
      style={styles.btn}
      onPress={() => value > min && onChange(value - 1)}
    >
      <Text style={styles.btnText}>−</Text>
    </TouchableOpacity>
    <Text style={styles.count}>{value}</Text>
    <TouchableOpacity
      style={styles.btn}
      onPress={() => value < max && onChange(value + 1)}
    >
      <Text style={styles.btnText}>+</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10,10,15,0.6)',
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderRadius: 24,
    overflow: 'hidden',
  },
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 20,
    color: colors.goldEnd,
    fontWeight: '600',
    lineHeight: 22,
  },
  count: {
    minWidth: 32,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: colors.textPrimary,
  },
});
