import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { usePaystack } from 'react-native-paystack-webview';
import { walletAPI, Wallet, WalletTransaction } from '../../services/api';
import { useStore } from '../../store/useStore';
import { GoldButton } from '../../components/GoldButton';
import { SkeletonCard } from '../../components/SkeletonCard';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { colors } from '../../theme/colors';
import { shadows } from '../../theme/shadows';
import { formatNaira } from '../../utils/formatNaira';

const quickAmounts = [5000, 10000, 20000, 50000];

const txConfig: Record<string, { icon: string; color: string; sign: '+' | '−' }> = {
  WALLET_CREDIT:   { icon: 'arrow-down', color: '#2ECC71', sign: '+' },
  WALLET_DEBIT:    { icon: 'arrow-up',   color: '#F87171', sign: '−' },
  WALLET_TRANSFER: { icon: 'right-left', color: colors.goldMid, sign: '−' },
};

export const WalletScreen = ({ navigation }: any) => {
  const user = useStore((s) => s.user);
  const setWalletBalance = useStore((s) => s.setWalletBalance);
  const { popup } = usePaystack();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isFunding, setIsFunding] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const [walletRes, txRes] = await Promise.all([
        walletAPI.getWallet(),
        walletAPI.getTransactions(),
      ]);
      setWallet(walletRes);
      setWalletBalance(Number(walletRes.balance));
      setTransactions(txRes.entries);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [setWalletBalance]);

  useEffect(() => { load(); }, [load]);

  const amountToFund = selectedAmount ?? Number(customAmount) ?? 0;

  const handleFund = () => {
    if (!amountToFund || amountToFund < 100) {
      Alert.alert('Enter an amount', 'Minimum top-up is ₦100.');
      return;
    }
    setIsFunding(true);
    popup.checkout({
      email: user?.email ?? '',
      amount: amountToFund,
      reference: `ZTR-WALLET-${Date.now()}`,
      onSuccess: async (res: any) => {
        try {
          const result = await walletAPI.fundWallet(amountToFund, res?.reference);
          setWalletBalance(result.balance);
          setModalVisible(false);
          setSelectedAmount(null);
          setCustomAmount('');
          Alert.alert('Success', result.message);
          load();
        } catch {
          Alert.alert('Payment received', 'Your card was charged but crediting your wallet failed — contact support with your payment reference.');
        } finally {
          setIsFunding(false);
        }
      },
      onCancel: () => setIsFunding(false),
      onError: () => {
        Alert.alert('Error', 'Payment failed. Please try again.');
        setIsFunding(false);
      },
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ padding: 24, gap: 14 }}>
          <SkeletonCard height={140} />
          <SkeletonCard height={60} />
          <SkeletonCard height={60} />
        </SafeAreaView>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          <ErrorState title="Couldn't load your wallet" subtitle="Something went wrong. Tap to retry." onRetry={load} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Wallet</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Balance card */}
        <LinearGradient colors={[colors.goldStart, colors.goldEnd]} style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceValue}>
            ₦{formatNaira((wallet?.balance ?? 0))}
          </Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Icon name="plus" size={12} color={colors.goldEnd} />
            <Text style={styles.addBtnText}>Add Money</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Transaction history */}
        <Text style={styles.sectionLabel}>Recent Activity</Text>
        {transactions.length === 0 ? (
          <EmptyState
            icon="receipt"
            title="No transactions yet"
            subtitle="Your wallet activity will show up here."
          />
        ) : (
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const config = txConfig[item.transactionType] ?? txConfig.WALLET_DEBIT;
              return (
                <View style={styles.txRow}>
                  <View style={[styles.txIconWrap, { backgroundColor: `${config.color}18` }]}>
                    <Icon name={config.icon} size={13} color={config.color} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDescription} numberOfLines={1}>{item.description}</Text>
                    <Text style={styles.txDate}>
                      {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: config.color }]}>
                    {config.sign}₦{formatNaira(item.amount)}
                  </Text>
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>

      {/* Add Money modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Money</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="xmark" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.amountGrid}>
              {quickAmounts.map((amt) => (
                <TouchableOpacity
                  key={amt}
                  style={[styles.amountChip, selectedAmount === amt && styles.amountChipActive]}
                  onPress={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                >
                  <Text style={[styles.amountChipText, selectedAmount === amt && styles.amountChipTextActive]}>
                    ₦{formatNaira(amt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.orLabel}>or enter a custom amount</Text>
            <View style={styles.customInputRow}>
              <Text style={styles.currencyPrefix}>₦</Text>
              <TextInput
                style={styles.customInput}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={customAmount}
                onChangeText={(v) => { setCustomAmount(v); setSelectedAmount(null); }}
              />
            </View>

            <GoldButton
              title={`Pay ₦${formatNaira(amountToFund)} with Paystack`}
              onPress={handleFund}
              loading={isFunding}
              disabled={!amountToFund}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: colors.textPrimary },
  balanceCard: {
    marginHorizontal: 24, marginBottom: 24,
    borderRadius: 20, padding: 22,
    ...shadows.goldGlowLg,
  },
  balanceLabel: { fontFamily: 'Inter-Medium', fontSize: 12, color: 'rgba(10,10,15,0.65)', marginBottom: 6 },
  balanceValue: { fontFamily: 'PlayfairDisplay-Black', fontSize: 36, color: '#0A0A0F', marginBottom: 16 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
    backgroundColor: 'rgba(10,10,15,0.1)',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9,
  },
  addBtnText: { fontFamily: 'Inter-Bold', fontSize: 13, color: '#0A0A0F' },
  sectionLabel: {
    fontFamily: 'PlayfairDisplay-Bold', fontSize: 17, color: colors.textPrimary,
    paddingHorizontal: 24, marginBottom: 14,
  },
  list: { paddingHorizontal: 24, gap: 10, paddingBottom: 32 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 14, padding: 12,
  },
  txIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1, gap: 2 },
  txDescription: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.textPrimary },
  txDate: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted },
  txAmount: { fontFamily: 'Inter-Bold', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1, borderColor: colors.borderGold,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: colors.textPrimary },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  amountChip: {
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 14, borderWidth: 1, borderColor: colors.borderGold,
    backgroundColor: colors.cardBg,
  },
  amountChipActive: { backgroundColor: colors.goldEnd, borderColor: 'transparent' },
  amountChipText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.textSecondary },
  amountChipTextActive: { color: '#0A0A0F' },
  orLabel: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.textMuted, textAlign: 'center', marginBottom: 12 },
  customInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 14, paddingHorizontal: 16, height: 52, marginBottom: 20,
  },
  currencyPrefix: { fontFamily: 'Inter-Bold', fontSize: 16, color: colors.goldEnd },
  customInput: { flex: 1, fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.textPrimary },
});
