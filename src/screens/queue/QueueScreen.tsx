import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { queuesAPI, QueueEntry } from '../../services/api';
import { ErrorState } from '../../components/ErrorState';
import { colors } from '../../theme/colors';

// Real backend statuses: WAITING → CALLED → CHECKED_IN (or CANCELLED at any point)
const stages = [
  { key: 'WAITING',     label: 'In Queue',     icon: 'clock' },
  { key: 'CALLED',      label: "You're Up",    icon: 'person-walking' },
  { key: 'CHECKED_IN',  label: 'Checked In',   icon: 'door-open' },
];

// No wait-time field exists on the backend — this is a rough, clearly-labeled
// estimate (3 min/position ahead), not a promise.
const estimateWait = (position: number) => {
  const mins = Math.max(position * 3, 2);
  return `~${mins}-${mins + 10} mins`;
};

export const QueueStatusScreen = ({ route, navigation }: any) => {
  // Two entry modes:
  // 1. venueId + venueName — fresh join, e.g. from a venue's "Join Queue" button.
  // 2. queueId + venueName — viewing an EXISTING membership (e.g. tapped from
  //    Itinerary) — must NOT call joinQueue again, that would create a
  //    duplicate queue entry for the same person at the same venue.
  const { venueId, venueName, queueId: existingQueueId } = route.params;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [entry, setEntry] = useState<QueueEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ]),
    ).start();
  }, []);

  const join = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      if (existingQueueId) {
        const pos = await queuesAPI.getQueuePosition(existingQueueId);
        setEntry({ id: existingQueueId, venueId: venueId ?? '', userId: '', position: pos.position, status: pos.status, createdAt: pos.createdAt });
      } else {
        const queueEntry = await queuesAPI.joinQueue(venueId);
        setEntry(queueEntry);
      }
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, existingQueueId]);

  useEffect(() => { join(); }, [join]);

  // Poll position every 10s once joined
  useEffect(() => {
    if (!entry) return;
    const poll = async () => {
      try {
        const pos = await queuesAPI.getQueuePosition(entry.id);
        setEntry((prev) => (prev ? { ...prev, position: pos.position, status: pos.status } : prev));
        if (pos.status === 'CANCELLED') {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // transient — next poll retries
      }
    };
    pollRef.current = setInterval(poll, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [entry?.id]);

  const handleCheckIn = async () => {
    if (!entry) return;
    try {
      const updated = await queuesAPI.checkIn(entry.id);
      setEntry(updated);
      Alert.alert("You're In!", 'Enjoy your night.');
      navigation.goBack();
    } catch {
      Alert.alert('Error', "Couldn't check in. Ask door staff for help.");
    }
  };

  const handleLeaveQueue = () => {
    Alert.alert('Leave Queue', 'Are you sure you want to leave the line?', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (!entry) return;
          try {
            await queuesAPI.cancel(entry.id);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Could not leave the queue. Please try again.');
          }
        },
      },
    ]);
  };

  if (hasError) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <ErrorState title="Couldn't join the queue" subtitle="Something went wrong. Tap to retry." onRetry={join} />
        </SafeAreaView>
      </View>
    );
  }

  const stageIndex = stages.findIndex((s) => s.key === (entry?.status ?? 'WAITING'));

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleLeaveQueue}>
            <Icon name="arrow-left" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>You're in Queue</Text>
            <Text style={styles.venueName}>{venueName}</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>

        <View style={styles.ringSection}>
          <Animated.View style={[styles.outerRing, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.middleRing}>
              <LinearGradient colors={[colors.cardBg, colors.bgElevated]} style={styles.innerCircle}>
                <Text style={styles.positionLabel}>Your Position</Text>
                <Text style={styles.positionNumber}>
                  {isLoading ? '—' : `#${entry?.position ?? '—'}`}
                </Text>
              </LinearGradient>
            </View>
          </Animated.View>

          <View style={styles.waitSection}>
            <Text style={styles.waitLabel}>Estimated Wait Time</Text>
            <Text style={styles.waitTime}>{entry ? estimateWait(entry.position) : '—'}</Text>
          </View>
        </View>

        <View style={styles.stagesCard}>
          {stages.map((stage, i) => {
            const isCompleted = i < stageIndex;
            const isActive = i === stageIndex;
            return (
              <View key={stage.key} style={styles.stageRow}>
                <View style={[styles.stageIconWrap, isCompleted && styles.stageIconCompleted, isActive && styles.stageIconActive]}>
                  <Icon
                    name={isCompleted ? 'check' : stage.icon}
                    size={12}
                    color={isCompleted || isActive ? '#0A0A0F' : colors.textMuted}
                  />
                </View>
                <Text style={[styles.stageLabel, isCompleted && styles.stageLabelCompleted, isActive && styles.stageLabelActive]}>
                  {stage.label}
                </Text>
                {isActive && (
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>Now</Text>
                  </View>
                )}
                {i < stages.length - 1 && (
                  <View style={[styles.stageConnector, isCompleted && styles.stageConnectorFilled]} />
                )}
              </View>
            );
          })}
        </View>

        {entry?.status === 'CALLED' ? (
          <TouchableOpacity style={styles.checkInBtn} onPress={handleCheckIn}>
            <Icon name="door-open" size={14} color="#0A0A0F" />
            <Text style={styles.checkInText}>Check In Now</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.notifyNote}>
            You will be notified when your turn is near.{'\n'}Keep this screen open or check back soon.
          </Text>
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
  headerCenter: { alignItems: 'center' },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: colors.textPrimary },
  venueName: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted, marginTop: 2 },
  ringSection: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  outerRing: {
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(201,151,42,0.06)',
    borderWidth: 1, borderColor: 'rgba(201,151,42,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  middleRing: {
    width: 186, height: 186, borderRadius: 93,
    backgroundColor: 'rgba(201,151,42,0.1)',
    borderWidth: 2, borderColor: 'rgba(201,151,42,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  innerCircle: { width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center', gap: 4 },
  positionLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.textMuted },
  positionNumber: { fontFamily: 'PlayfairDisplay-Black', fontSize: 52, color: colors.goldEnd, lineHeight: 60 },
  waitSection: { alignItems: 'center', gap: 4 },
  waitLabel: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.textMuted },
  waitTime: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: colors.textPrimary },
  stagesCard: {
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 18, padding: 18, marginHorizontal: 24, marginBottom: 16,
  },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, position: 'relative' },
  stageIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  stageIconCompleted: { backgroundColor: '#2ECC71', borderColor: '#2ECC71' },
  stageIconActive: { backgroundColor: colors.goldEnd, borderColor: colors.goldEnd },
  stageLabel: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textMuted },
  stageLabelCompleted: { color: '#2ECC71' },
  stageLabelActive: { color: colors.textPrimary, fontFamily: 'Inter-SemiBold' },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(201,151,42,0.12)',
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.goldEnd },
  activeText: { fontFamily: 'Inter-SemiBold', fontSize: 9, color: colors.goldEnd },
  stageConnector: { position: 'absolute', left: 15, top: 42, width: 2, height: 20, backgroundColor: colors.borderGold },
  stageConnectorFilled: { backgroundColor: '#2ECC71' },
  checkInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.goldEnd,
    marginHorizontal: 24, marginBottom: 32,
    borderRadius: 14, paddingVertical: 16,
  },
  checkInText: { fontFamily: 'Inter-Bold', fontSize: 14, color: '#0A0A0F' },
  notifyNote: {
    fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: 32, marginBottom: 32,
  },
});
