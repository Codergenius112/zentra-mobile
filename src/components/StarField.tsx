import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface StarProps {
  x: number;
  y: number;
  size: number;
  isGold: boolean;
  duration: number;
  delay: number;
  minOp: number;
  maxOp: number;
}

function Star({ x, y, size, isGold, duration, delay, minOp, maxOp }: StarProps) {
  const opacity = useRef(new Animated.Value(minOp)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay * 1000),
        Animated.timing(opacity, { toValue: maxOp, duration: duration * 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: minOp, duration: duration * 500, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${x}%` as any,
        top: `${y}%` as any,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: isGold ? 'rgba(245,200,66,0.8)' : '#fff',
        opacity,
      }}
    />
  );
}

interface StarFieldProps {
  count?: number;
  maxTop?: number;
}

export default function StarField({ count = 60, maxTop = 65 }: StarFieldProps) {
  const stars = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * maxTop,
      size: Math.random() * 1.8 + 0.3,
      isGold: Math.random() < 0.12,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 6,
      minOp: Math.random() * 0.07 + 0.03,
      maxOp: Math.random() * 0.28 + 0.08,
    }));
  }, []);

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {stars.map((s) => (
        <Star key={s.id} {...s} />
      ))}
    </View>
  );
}
