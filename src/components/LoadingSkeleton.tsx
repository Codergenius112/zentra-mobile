/**
 * LoadingSkeleton Component
 * 
 * Reusable skeleton loader with shimmer animation
 * Used across all screens for consistent loading UX
 */
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function LoadingSkeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: LoadingSkeletonProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          height,
          borderRadius,
          backgroundColor: 'rgba(255,255,255,0.1)',
          opacity,
          ...(typeof width === 'number' ? { width } : {}),
        },
        typeof width === 'string' && { width: width as any },
        style,
      ]}
    />
  );
}

// Pre-built skeleton compositions for common use cases
export const SkeletonCard = () => (
  <View style={skeletonStyles.card}>
    <LoadingSkeleton width="70%" height={18} borderRadius={6} />
    <View style={skeletonStyles.row}>
      <LoadingSkeleton width="40%" height={14} />
      <LoadingSkeleton width="30%" height={14} />
    </View>
    <LoadingSkeleton width="100%" height={40} borderRadius={8} />
  </View>
);

export const SkeletonList = ({ count = 5 }: { count?: number }) => (
  <View style={skeletonStyles.list}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </View>
);

export const SkeletonEventCard = () => (
  <View style={skeletonStyles.eventCard}>
    <LoadingSkeleton width="100%" height={180} borderRadius={12} />
    <View style={skeletonStyles.eventInfo}>
      <LoadingSkeleton width="80%" height={20} borderRadius={6} />
      <LoadingSkeleton width="60%" height={14} />
      <LoadingSkeleton width="40%" height={14} />
    </View>
  </View>
);

export const SkeletonMenuItem = () => (
  <View style={skeletonStyles.menuItem}>
    <View style={skeletonStyles.menuItemInfo}>
      <LoadingSkeleton width="70%" height={16} />
      <LoadingSkeleton width="90%" height={12} />
      <LoadingSkeleton width="40%" height={16} />
    </View>
    <LoadingSkeleton width={36} height={36} borderRadius={18} />
  </View>
);

export const SkeletonBookingCard = () => (
  <View style={skeletonStyles.bookingCard}>
    <LoadingSkeleton width="50%" height={18} />
    <LoadingSkeleton width="70%" height={14} />
    <View style={skeletonStyles.row}>
      <LoadingSkeleton width="30%" height={14} />
      <LoadingSkeleton width="40%" height={14} />
    </View>
  </View>
);

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  list: {
    padding: 20,
  },
  eventCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  eventInfo: {
    padding: 16,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  menuItemInfo: {
    flex: 1,
    gap: 6,
  },
  bookingCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
});
