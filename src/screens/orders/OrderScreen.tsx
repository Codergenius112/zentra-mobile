import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome6 as Icon } from '@expo/vector-icons';
import { menuAPI, ordersAPI, MenuItem } from '../../services/api';
import { GoldButton } from '../../components/GoldButton';
import { SkeletonCard } from '../../components/SkeletonCard';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { colors } from '../../theme/colors';
import { formatNaira } from '../../utils/formatNaira';

const categories = [
  { key: 'food',      label: 'Food' },
  { key: 'drinks',    label: 'Drinks' },
  { key: 'cocktails', label: 'Cocktails' },
  { key: 'bottles',   label: 'Bottles' },
  { key: 'desserts',  label: 'Desserts' },
  { key: 'extras',    label: 'Extras' },
];

interface CartItem extends MenuItem { qty: number; }

export const TableOrderScreen = ({ route, navigation }: any) => {
  // bookingId is required — orders attach to an existing confirmed table
  // booking, they're not placed against a bare venueId/tableId pair.
  const { bookingId, venueId, tableId, tableName } = route.params;
  const [activeCategory, setActiveCategory] = useState('food');
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const menu = await menuAPI.getMenu(venueId, activeCategory);
      setItems(menu.filter((m) => m.isAvailable));
    } catch (err) {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, activeCategory]);

  useEffect(() => { load(); }, [load]);

  const updateCart = (item: MenuItem, delta: number) => {
    setCart((prev) => {
      const current = prev[item.id];
      const newQty = (current?.qty || 0) + delta;
      if (newQty <= 0) {
        const { [item.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [item.id]: { ...item, qty: newQty } };
    });
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((a, i) => a + i.qty, 0);
  const cartTotal = cartItems.reduce((a, i) => a + i.price * i.qty, 0);

  const handleSubmitOrder = async () => {
    if (!bookingId) {
      Alert.alert('No table booking found', "You'll need a confirmed table booking before ordering.");
      return;
    }
    setIsSubmitting(true);
    try {
      await ordersAPI.createOrder(
        bookingId,
        cartItems.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.qty })),
        tableId ? { type: 'table', tableInfo: { tableId, tableName, category: 'standard', venueId } } : undefined,
      );
      Alert.alert('Order Sent!', 'Your order has been sent to the venue.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Could not place your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A0F', '#0D0D1A']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={14} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Order</Text>
            <Text style={styles.subtitle}>{tableName}</Text>
          </View>
          <View style={styles.cartBtn}>
            <Icon name="bag-shopping" size={16} color={colors.goldEnd} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </View>
        </View>

        <FlatList
          data={categories}
          horizontal
          style={styles.catList}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catRow}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.catTab, activeCategory === item.key && styles.catTabActive]}
              onPress={() => setActiveCategory(item.key)}
            >
              <Text style={[styles.catText, activeCategory === item.key && styles.catTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {isLoading ? (
          <View style={{ paddingHorizontal: 24, gap: 12 }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} height={90} />)}
          </View>
        ) : hasError ? (
          <ErrorState title="Couldn't load the menu" subtitle="Something went wrong. Tap to retry." onRetry={load} />
        ) : items.length === 0 ? (
          <EmptyState icon="utensils" title="Nothing here yet" subtitle={`No ${activeCategory} items available right now.`} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.menuList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const qty = cart[item.id]?.qty || 0;
              return (
                <View style={styles.menuItem}>
                  <Image source={{ uri: item.imageUrl }} style={styles.menuItemImg} />
                  <View style={styles.menuItemInfo}>
                    <Text style={styles.menuItemName}>{item.name}</Text>
                    <Text style={styles.menuItemPrice}>₦{formatNaira(item.price)}</Text>
                  </View>
                  {qty === 0 ? (
                    <TouchableOpacity style={styles.addBtn} onPress={() => updateCart(item, 1)}>
                      <LinearGradient colors={[colors.goldStart, colors.goldEnd]} style={styles.addBtnGrad}>
                        <Icon name="plus" size={14} color="#0A0A0F" />
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.qtyControl}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCart(item, -1)}>
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyCount}>{qty}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCart(item, 1)}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
        )}

        {cartCount > 0 && (
          <View style={styles.cartBar}>
            <View>
              <Text style={styles.cartBarCount}>{cartCount} Item{cartCount > 1 ? 's' : ''}</Text>
              <Text style={styles.cartBarTotal}>₦{formatNaira(cartTotal)}</Text>
            </View>
            <GoldButton
              title="Send Order"
              onPress={handleSubmitOrder}
              loading={isSubmitting}
              style={{ flex: 1 }}
            />
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
  headerCenter: { alignItems: 'center' },
  title: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: colors.textPrimary },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: 11, color: colors.textMuted, marginTop: 2 },
  cartBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.goldEnd,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.bgPrimary,
  },
  cartBadgeText: { fontFamily: 'Inter-Bold', fontSize: 8, color: '#0A0A0F' },
  catList: { flexGrow: 0, marginBottom: 16 },
  catRow: { paddingHorizontal: 24, gap: 10 },
  catTab: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: colors.borderGold,
  },
  catTabActive: { backgroundColor: colors.goldEnd, borderColor: 'transparent' },
  catText: { fontFamily: 'Inter-Medium', fontSize: 13, color: colors.textSecondary },
  catTextActive: { color: '#0A0A0F', fontFamily: 'Inter-Bold' },
  menuList: { paddingHorizontal: 24, gap: 12, paddingBottom: 100 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.cardBg,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 16, padding: 12,
  },
  menuItemImg: { width: 64, height: 64, borderRadius: 12 },
  menuItemInfo: { flex: 1 },
  menuItemName: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: 4 },
  menuItemPrice: { fontFamily: 'Inter-Bold', fontSize: 14, color: colors.goldEnd },
  addBtn: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden' },
  addBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  qtyControl: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1, borderColor: colors.borderGold,
    borderRadius: 22, overflow: 'hidden',
  },
  qtyBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, color: colors.goldEnd, fontWeight: '600', lineHeight: 20 },
  qtyCount: { minWidth: 28, textAlign: 'center', fontFamily: 'Inter-Bold', fontSize: 13, color: colors.textPrimary },
  cartBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 16, paddingBottom: 32,
    backgroundColor: 'rgba(10,10,15,0.97)',
    borderTopWidth: 1, borderTopColor: 'rgba(201,151,42,0.12)',
  },
  cartBarCount: { fontFamily: 'Inter-Medium', fontSize: 12, color: colors.textMuted },
  cartBarTotal: { fontFamily: 'PlayfairDisplay-Bold', fontSize: 17, color: colors.goldEnd },
});
