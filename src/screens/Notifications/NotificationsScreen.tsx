import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { notificationsAPI, AppNotification } from '../../services/api';
import { SkeletonCard } from '../../components/SkeletonCard';
import { EmptyState } from '../../components/EmptyState';
import { colors } from '../../theme/colors';

const iconMap: Record<string, { icon: string; color: string }> = {
  booking:  { icon: 'calendar-check', color: '#2ECC71' },
  table:    { icon: 'crown',          color: colors.goldEnd },
  ride:     { icon: 'car-side',       color: colors.rides },
  payment:  { icon: 'wallet',         color: colors.goldMid },
  promo:    { icon: 'bell',           color: colors.goldEnd },
  ticket:   { icon: 'ticket',         color: '#2ECC71' },
  general:  { icon: 'circle-info',    color: colors.textMuted },
};

const isToday = (date: Date) => {
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
};

export const NotificationsScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await notificationsAPI.getMyNotifications({ limit: 50 });
      setNotifications(res.notifications);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { today, earlier } = useMemo(() => {
    const t: AppNotification[] = [];
    const e: AppNotification[] = [];
    for (const n of notifications) {
      (isToday(new Date(n.createdAt)) ? t : e).push(n);
    }
    return { today: t, earlier: e };
  }, [notifications]);

  const handleTap = async (item: AppNotification) => {
    if (!item.isRead) {
      setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, isRead: true } : n));
      notificationsAPI.markAsRead(item.id).catch(() => {});
    }
    // Deep-link if the notification carries a bookingId
    if (item.data?.bookingId) {
      navigation.navigate('BookingConfirmation', { bookingId: item.data.bookingId });
    }
  };

  const handleClearAll = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationsAPI.markAllAsRead();
    } catch {
      load(); // resync if it failed
    }
  };

  const renderItem = (item: AppNotification) => {
    const config = iconMap[item.type] || iconMap.general;
    const time = new Date(item.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.notifRow, !item.isRead && styles.notifRowUnread]}
        onPress={() => handleTap(item)}
      >
        {!item.isRead && <View style={styles.unreadBar} />}
        <View style={[styles.notifIconWrap, { backgroundColor: `${config.color}18` }]}>
          <Icon name={config.icon} size={14} color={config.color} />
        </View>
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifMeta} numberOfLines={1}>{item.message}</Text>
        </View>
        <Text style={styles.notifTime}>{time}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Activity</Text>
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearAll}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 24, gap: 10 }}>
            {[1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} height={72} />)}
          </View>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="bell-slash"
            title="No activity yet"
            subtitle="Booking updates and alerts will show up here."
          />
        ) : (
          <View style={styles.list}>
            {today.length > 0 && (
              <>
                <Text style={styles.groupLabel}>TODAY</Text>
                {today.map(renderItem)}
              </>
            )}
            {earlier.length > 0 && (
              <>
                <Text style={styles.groupLabel}>EARLIER</Text>
                {earlier.map(renderItem)}
              </>
            )}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: colors.textPrimary },
  clearAll: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.goldMid },
  list: { paddingHorizontal: 24, paddingBottom: 32 },
  groupLabel: {
    fontFamily: 'Inter-Medium', fontSize: 10, color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginTop: 18, marginBottom: 8,
  },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 14, padding: 12, marginBottom: 10,
    overflow: 'hidden',
  },
  notifRowUnread: {
    borderColor: 'rgba(201,151,42,0.3)',
    backgroundColor: 'rgba(20,20,32,0.95)',
  },
  unreadBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: colors.goldEnd, borderRadius: 2,
  },
  notifIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  notifContent: { flex: 1, gap: 3 },
  notifTitle: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.textPrimary },
  notifMeta: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted },
  notifTime: { fontFamily: 'Inter-Regular', fontSize: 10, color: colors.textMuted },
});
