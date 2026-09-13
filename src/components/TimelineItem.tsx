import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { BadgePill } from './BadgePill';
import { colors } from '../theme/colors';

type TimelineStatus = 'confirmed' | 'upcoming' | 'active' | 'completed';

interface TimelineItemProps {
  time: string;
  title: string;
  meta: string;
  icon: string;
  iconColor: string;
  status: TimelineStatus;
  isLast?: boolean;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({
  time, title, meta, icon, iconColor, status, isLast,
}) => {
  const borderColor =
    status === 'confirmed' ? colors.success :
    status === 'active' ? colors.active :
    status === 'completed' ? colors.textMuted :
    colors.goldEnd;

  return (
    <View style={styles.wrapper}>
      <View style={styles.leftCol}>
        <Text style={styles.time}>{time}</Text>
        {!isLast && <View style={styles.connector} />}
      </View>
      <View style={[styles.card, { borderLeftColor: borderColor, opacity: status === 'completed' ? 0.6 : 1 }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${iconColor}20` }]}>
            <Icon name={icon} size={14} color={iconColor} />
          </View>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <BadgePill
            label={status === 'confirmed' ? 'Confirmed' : status === 'active' ? 'Now' : status === 'completed' ? 'Done' : 'Upcoming'}
            variant={status === 'confirmed' ? 'confirmed' : status === 'active' ? 'active' : 'upcoming'}
          />
        </View>
        <Text style={styles.meta}>{meta}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  leftCol: { width: 52, alignItems: 'flex-end', paddingTop: 14 },
  time: { fontFamily: 'Inter-SemiBold', fontSize: 11, color: colors.textMuted },
  connector: { width: 1, flex: 1, backgroundColor: colors.borderGold, marginTop: 6 },
  card: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderGold,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: 'PlayfairDisplay-SemiBold',
    fontSize: 13,
    color: colors.textPrimary,
  },
  meta: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted, lineHeight: 16 },
});
