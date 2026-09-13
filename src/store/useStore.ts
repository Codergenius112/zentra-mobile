import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// The store owns the notion of "who is signed in". services/api.ts imports this
// type for its auth responses — the dependency runs api.ts -> useStore only.
// useStore must never import api.ts: api.ts reads useStore.getState() inside its
// request interceptor, so importing back would be a runtime cycle.
export interface AuthUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

// Deliberately loose and structurally compatible with BackendBooking in
// services/api.ts. Only `id` is required so that any booking shape the backend
// returns can be stored without the two modules having to agree on every field.
// No index signature: an interface is not assignable to `{ [key: string]: any }`
// under TS, which would break `addBooking(backendBooking)` at the call sites.
export interface StoredBooking {
  id: string;
  status?: string;
  bookingType?: string;
  totalAmount?: number;
  createdAt?: string;
}

interface StoreState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  // null means "never loaded" — distinct from a real ₦0 balance. ProfileScreen
  // relies on that difference rather than showing ₦0 for an unfetched wallet.
  walletBalance: number | null;
  bookings: StoredBooking[];
  hasHydrated: boolean;

  login: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  addBooking: (booking: StoredBooking) => void;
  setWalletBalance: (balance: number) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      walletBalance: null,
      bookings: [],
      hasHydrated: false,

      // RootNavigator swaps Auth -> Main on its own once this flips; LoginScreen
      // and SignUpScreen deliberately navigate nowhere after calling it.
      login: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      logout: () =>
        set({
          isAuthenticated: false,
          user: null,
          accessToken: null,
          refreshToken: null,
          walletBalance: null,
          bookings: [],
        }),

      addBooking: (booking) =>
        set((state) => ({
          bookings: [booking, ...state.bookings.filter((b) => b.id !== booking.id)],
        })),

      setWalletBalance: (balance) => set({ walletBalance: balance }),
    }),
    {
      name: 'zentra-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist the session, not the caches. `bookings` is written by two call
      // sites but read by none (MyBookingsScreen and BookingConfirmationScreen
      // both fetch from the API), so growing AsyncStorage with it buys nothing.
      // Actions and hasHydrated are excluded too — hasHydrated must always start
      // false on a cold boot, or the gate in RootNavigator is meaningless.
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        walletBalance: state.walletBalance,
      }),
      onRehydrateStorage: () => () => {
        useStore.setState({ hasHydrated: true });
      },
    },
  ),
);

// If createJSONStorage ever yields a falsy storage, persist() returns early and
// never calls hydrate() — so onRehydrateStorage never fires and hasHydrated
// stays false forever, leaving RootNavigator rendering nothing and bricking the
// app. This backstop costs nothing on the normal path (the flag is already true
// by then) and turns that failure mode into a two-second delay instead.
setTimeout(() => {
  if (!useStore.getState().hasHydrated) {
    useStore.setState({ hasHydrated: true });
  }
}, 2000);
