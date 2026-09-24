import axios from 'axios';
import { useStore } from '../store/useStore';
import type { AuthUser } from '../store/useStore';

/**
 * ─── BACKEND CONTRACT ────────────────────────────────────────────────────────
 * This file was reconstructed from its ~20 surviving consumers after being
 * deleted. Every path below is marked:
 *
 *   [documented] — named in a comment that survived in a screen file
 *   [inferred]   — conventional REST, no surviving evidence
 *
 * The [inferred] paths are UNVERIFIED: the backend at API_URL currently returns
 * Railway's "Application not found", so nothing here could be exercised while
 * reconstructing. Treat this table as the spec a backend must satisfy — if a
 * call 404s, this is the first place to look, and the fix belongs here alone.
 *
 * Response WRAPPER KEYS differ per resource and must match exactly. A wrong key
 * produces a silently empty screen, not an error, which is the single most
 * likely defect class in this file:
 *
 *   events        -> { events }          bookings      -> { bookings }
 *   venues        -> { data }   (!)      notifications -> { notifications, unreadCount }
 *   cars          -> { listings }        itinerary     -> { items }
 *   apartments    -> { listings }        wallet txs    -> { entries }
 *   tables        -> { tables }          menu          -> BARE ARRAY (!)
 *
 * Endpoints returning a single entity return it DIRECTLY, not wrapped:
 * getEventById, getVenueById, getListing, getBooking, getBookingById, getTicket,
 * getWallet, joinQueue, checkIn.
 *
 * ── Endpoint table ──────────────────────────────────────────────────────────
 * POST  /auth/login                      [inferred]   authAPI.login
 * POST  /auth/register                   [inferred]   authAPI.register
 * POST  /auth/forgot-password            [inferred]   authAPI.forgotPassword
 * POST  /auth/reset-password             [inferred]   authAPI.resetPassword
 * GET   /events                          [inferred]   eventsAPI.getEvents
 * GET   /events/:id                      [inferred]   eventsAPI.getEventById
 * GET   /venues                          [documented] venuesAPI.getVenues — STAFF-ONLY, 403s for customers
 * GET   /venues/:id                      [documented] venuesAPI.getVenueById — open to customers
 * GET   /tables/venue/:venueId           [documented] tableListingsAPI.getVenueTables
 * GET   /tables/event/:eventId           [documented] tableListingsAPI.getEventTables
 * POST  /tables                          [documented] tablesAPI.bookTable
 * GET   /tables/:id                      [documented] tablesAPI.getBooking
 * GET   /apartments                      [inferred]   apartmentsAPI.getListings
 * GET   /apartments/:id                  [inferred]   apartmentsAPI.getListing
 * POST  /apartments/book                 [inferred]   apartmentsAPI.bookApartment
 * GET   /cars                            [inferred]   carsAPI.getListings
 * GET   /cars/:id                        [inferred]   carsAPI.getListing
 * POST  /cars/rent                       [inferred]   carsAPI.rentCar
 * GET   /bookings/me                     [inferred]   bookingsAPI.getMyBookings
 * GET   /bookings/:id                    [inferred]   bookingsAPI.getBookingById
 * POST  /bookings/group                  [inferred]   bookingsAPI.createGroupBooking
 * GET   /notifications/me                [inferred]   notificationsAPI.getMyNotifications
 * PATCH /notifications/:id/read          [inferred]   notificationsAPI.markAsRead
 * PATCH /notifications/read-all          [inferred]   notificationsAPI.markAllAsRead
 * GET   /itinerary/me                    [inferred]   itineraryAPI.getMyItinerary
 * POST  /queues                          [inferred]   queuesAPI.joinQueue
 * GET   /queues/:id                      [inferred]   queuesAPI.getQueuePosition
 * POST  /queues/:id/check-in             [inferred]   queuesAPI.checkIn
 * PATCH /queues/:id/cancel               [inferred]   queuesAPI.cancel
 * GET   /menu/:venueId                   [inferred]   menuAPI.getMenu
 * POST  /orders                          [inferred]   ordersAPI.createOrder
 * POST  /tickets                         [inferred]   ticketsAPI.createTicket — strong inference, the /tickets namespace already exists
 * GET   /tickets/:id                     [documented] ticketsAPI.getTicket
 * PATCH /tickets/:id/cancel              [documented] ticketsAPI.cancelTicket
 * GET   /wallet                          [inferred]   walletAPI.getWallet
 * GET   /wallet/transactions             [inferred]   walletAPI.getTransactions
 * POST  /wallet/fund                     [inferred]   walletAPI.fundWallet
 * POST  /payments/verify                 [inferred]   paymentsAPI.verifyPayment — PURE GUESS, no surviving evidence
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://dlifestyle-backend-production.up.railway.app';

// Flat, additive, in naira — NOT a multiplier. TableBookingScreen computes
// `Number(price) + SERVICE_CHARGE`, and TicketScreen's cancel warning hardcodes
// "Service charge (₦400) is non-refundable".
export const SERVICE_CHARGE = 400;

const client = axios.create({ baseURL: API_URL, timeout: 20000 });

client.interceptors.request.use((config) => {
  const token = useStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Deliberately NO response interceptor that logs out on 401. Swapping
// RootNavigator to the Auth stack mid-checkout would eject the user from
// PaymentScreen in the middle of a transaction — the worst possible moment.
// The cost is that an expired token surfaces as per-screen ErrorStates until
// the user signs out from Profile, which is the better trade.
//
// Errors are passed through untouched: consumers read `err?.response?.data?.message`.

// ─── Types ───────────────────────────────────────────────────────────────────
// Rebuilt field-by-field from property accesses in the surviving screens.
// Required-vs-optional below is load-bearing under `strict: true`, not stylistic:
// e.g. CarListing.features MUST be required because RideDetailScreen does
// `features?.length > 0`, which is a TS error if the field is optional.

export interface BackendEvent {
  id: string;
  name: string;
  images?: string[];
  startDate: string;
  endDate?: string;
  genre?: string;
  ticketPrice: number;
  // Lowercase ('active') — unlike booking/queue statuses, which are UPPER_SNAKE.
  status: string;
  venueId?: string | null;
  dresscode?: string;
  djs?: string[];
  description?: string;
}

export interface BackendVenue {
  id: string;
  name: string;
  mediaUrls?: string[];
  city: string;
  address: string;
  maxCapacity: number;
  category: string;
  isActive: boolean;
}

export interface CarListing {
  id: string;
  make: string;
  model: string;
  images?: string[];
  pricePerDay: number;
  city: string;
  businessName?: string;
  seats: number;
  transmission: string;
  color: string;
  withDriver: boolean;
  isActive: boolean;
  category: string;
  description?: string;
  features: string[];
  unavailableDates?: string[] | null;
}

export interface ApartmentListing {
  id: string;
  name: string;
  images?: string[];
  pricePerNight: number;
  city: string;
  address: string;
  businessName?: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  isActive: boolean;
  amenities: string[];
  cautionFee: number;
  cautionFeeRefundable: boolean;
  description?: string;
  houseRules?: string;
  unavailableDates?: string[] | null;
}

export interface TableListing {
  id: string;
  // Required: SelectTablesScreen calls `table.name.match(/\d+/)` unguarded.
  name: string;
  // 'standard' | 'vip' | 'vvip' | 'booth' | 'private'
  category: string;
  capacity: number;
  price: number;
  available: boolean;
  description?: string;
  venueId?: string;
  features?: string[];
}

export interface BookingMetadata {
  eventId?: string;
  venueId?: string;
  venueName?: string;
  tableName?: string;
  tableNumber?: string;
  bookingDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
  pickupDate?: string;
  returnDate?: string;
  driverLicense?: string;
  pickupLocation?: string;
  [key: string]: any;
}

export interface BackendBooking {
  id: string;
  // INITIATED | PENDING_PAYMENT | PENDING_GROUP_PAYMENT | CONFIRMED |
  // CHECKED_IN | ACTIVE | COMPLETED | CANCELLED | EXPIRED
  // Plain `string`, not a union: MyBookingsScreen indexes Record<string, …> with it.
  status: string;
  // 'ticket' | 'table' | 'apartment' | 'car'
  bookingType: string;
  resourceId: string;
  guestCount: number;
  totalAmount: number;
  createdAt: string;
  paymentStatus?: string;
  basePrice?: number;
  serviceCharge?: number;
  paymentReference?: string;
  userId?: string;
  // Required (not optional) because BookingConfirmationScreen dereferences
  // `b.metadata.checkInDate` without `?.` on line 100. Runtime-safe: that line
  // sits behind a truthiness guard on the optional-chained read above it.
  metadata: BookingMetadata;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: { bookingId?: string; [key: string]: any };
}

export interface ItineraryItem {
  id: string;
  // 'ride' | 'stay' | 'event' | 'table' | 'queue'
  type: string;
  title: string;
  subtitle?: string;
  status: string;
  timestamp?: string | null;
  bookingId?: string;
}

export interface QueueEntry {
  id: string;
  venueId: string;
  userId: string;
  position: number;
  // WAITING -> CALLED -> CHECKED_IN (or CANCELLED at any point)
  status: string;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  category?: string;
  description?: string;
}

export interface Wallet {
  balance: number | string;
  userId?: string;
  currency?: string;
}

export interface WalletTransaction {
  id: string;
  // WALLET_CREDIT | WALLET_DEBIT | WALLET_TRANSFER
  transactionType: string;
  description: string;
  amount: number;
  createdAt: string;
}

export interface PaymentVerification {
  verified: boolean;
  status: string;
  reference: string;
  booking?: BackendBooking;
  message?: string;
}

// ─── Response normalization helpers ──────────────────────────────────────────
// Guarantee the array contract at the boundary so no screen has to write `?? []`
// and none can crash mapping over undefined. This is null-safety, not mock data:
// a failed request still rejects and still surfaces the real ErrorState.

const asArray = <T,>(value: any): T[] => (Array.isArray(value) ? (value as T[]) : []);

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export const authAPI = {
  login: (email: string, password: string): Promise<AuthResponse> =>
    client.post('/auth/login', { email, password }).then((r) => r.data),

  register: (body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<AuthResponse> => client.post('/auth/register', body).then((r) => r.data),

  // resetToken is present only when the backend is in dev/dev-disclosure mode;
  // ForgotPasswordScreen treats its absence as "check your email".
  forgotPassword: (email: string): Promise<{ message?: string; resetToken?: string }> =>
    client.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, newPassword: string): Promise<any> =>
    client.post('/auth/reset-password', { token, newPassword }).then((r) => r.data),
};

// ─── Events ──────────────────────────────────────────────────────────────────

export const eventsAPI = {
  getEvents: (params?: { limit?: number }): Promise<{ events: BackendEvent[] }> =>
    client
      .get('/events', { params })
      .then((r) => ({ events: asArray<BackendEvent>(r.data?.events) })),

  getEventById: (id: string): Promise<BackendEvent> =>
    client.get(`/events/${id}`).then((r) => r.data?.event ?? r.data),
};

// ─── Venues ──────────────────────────────────────────────────────────────────

export const venuesAPI = {
  // GET /venues is staff-only on the backend, so this 403s for normal customers.
  // Callers swallow it per-call (HomeScreen) — do NOT wrap it in a Promise.all
  // alongside other fetches or one 403 takes the whole screen down.
  getVenues: (params?: { limit?: number; category?: string }): Promise<{ data: BackendVenue[] }> =>
    client.get('/venues', { params }).then((r) => ({ data: asArray<BackendVenue>(r.data?.data) })),

  // Open to customers, unlike the list endpoint.
  getVenueById: (id: string): Promise<BackendVenue> =>
    client.get(`/venues/${id}`).then((r) => r.data?.venue ?? r.data),
};

// ─── Table listings (read-only floor plans) ──────────────────────────────────
// Two routes because tables live in two places: a recurring venue (club, lounge)
// owns its tables and shares them across every event held there, while a one-off
// space (stadium, field) has tables registered directly on the event.

export const tableListingsAPI = {
  getVenueTables: (venueId: string): Promise<{ tables: TableListing[] }> =>
    client
      .get(`/tables/venue/${venueId}`)
      .then((r) => ({ tables: asArray<TableListing>(r.data?.tables) })),

  getEventTables: (eventId: string): Promise<{ tables: TableListing[] }> =>
    client
      .get(`/tables/event/${eventId}`)
      .then((r) => ({ tables: asArray<TableListing>(r.data?.tables) })),
};

// ─── Tables (booking) ────────────────────────────────────────────────────────

export interface BookTablePayload {
  venueId?: string | null;
  tableId: string;
  tableNumber: string;
  venueName?: string;
  guestCount: number;
  // ISO. Optional because an event-scoped table derives its date from the event.
  bookingDate?: string;
  // BARE table price — no service charge. The backend adds its own charges and
  // the returned booking.totalAmount is authoritative.
  price: number;
  // Present only for event-scoped tables, which marks the booking event-scoped
  // and lets the backend combine it with the ticket fields below.
  eventId?: string;
  ticketQuantity?: number;
  ticketTotal?: number;
}

export const tablesAPI = {
  bookTable: (payload: BookTablePayload): Promise<BackendBooking> =>
    client.post('/tables', payload).then((r) => r.data?.booking ?? r.data),

  getBooking: (bookingId: string): Promise<BackendBooking> =>
    client.get(`/tables/${bookingId}`).then((r) => r.data?.booking ?? r.data),
};

// ─── Apartments / stays ──────────────────────────────────────────────────────

export const apartmentsAPI = {
  getListings: (params?: { limit?: number }): Promise<{ listings: ApartmentListing[] }> =>
    client
      .get('/apartments', { params })
      .then((r) => ({ listings: asArray<ApartmentListing>(r.data?.listings) })),

  getListing: (id: string): Promise<ApartmentListing> =>
    client.get(`/apartments/${id}`).then((r) => r.data?.apartment ?? r.data),

  bookApartment: (payload: {
    apartmentId: string;
    checkInDate: string;
    checkOutDate: string;
    price: number;
  }): Promise<BackendBooking> =>
    client.post('/apartments/book', payload).then((r) => r.data?.booking ?? r.data),
};

// ─── Cars / rides ────────────────────────────────────────────────────────────

export const carsAPI = {
  getListings: (params?: { limit?: number }): Promise<{ listings: CarListing[] }> =>
    client
      .get('/cars', { params })
      .then((r) => ({ listings: asArray<CarListing>(r.data?.listings) })),

  getListing: (id: string): Promise<CarListing> =>
    client.get(`/cars/${id}`).then((r) => r.data?.car ?? r.data),

  rentCar: (payload: {
    carId: string;
    pickupDate: string;
    returnDate: string;
    price: number;
    driverLicense: string;
    pickupLocation: string;
  }): Promise<BackendBooking> =>
    client.post('/cars/rent', payload).then((r) => r.data?.booking ?? r.data),
};

// ─── Bookings ────────────────────────────────────────────────────────────────

export interface GroupBookingPayload {
  bookingType: 'table';
  venueId?: string | null;
  eventId?: string | null;
  tableId: string;
  tableName: string;
  tablePrice: number;
  guestCount: number;
  bookingDate?: string;
  ticketQuantity?: number;
  ticketTotal?: number;
  // People splitting, organiser included. Sent so the backend can implement real
  // per-person contributions later without a client change — today the returned
  // booking simply lands in PENDING_GROUP_PAYMENT.
  splitCount: number;
}

export const bookingsAPI = {
  getMyBookings: (params?: { limit?: number }): Promise<{ bookings: BackendBooking[] }> =>
    client
      .get('/bookings/me', { params })
      .then((r) => ({ bookings: asArray<BackendBooking>(r.data?.bookings) })),

  getBookingById: (id: string): Promise<BackendBooking> =>
    client.get(`/bookings/${id}`).then((r) => r.data?.booking ?? r.data),

  createGroupBooking: (payload: GroupBookingPayload): Promise<BackendBooking> =>
    client.post('/bookings/group', payload).then((r) => r.data?.booking ?? r.data),
};

// ─── Notifications ───────────────────────────────────────────────────────────

export const notificationsAPI = {
  // unreadCount is the TOTAL unread, independent of `limit` — HomeScreen fetches
  // with limit:1 purely to read the badge count cheaply.
  getMyNotifications: (
    params?: { limit?: number },
  ): Promise<{ notifications: AppNotification[]; unreadCount: number }> =>
    client.get('/notifications/me', { params }).then((r) => ({
      notifications: asArray<AppNotification>(r.data?.notifications),
      unreadCount: Number(r.data?.unreadCount ?? 0),
    })),

  markAsRead: (id: string): Promise<any> =>
    client.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllAsRead: (): Promise<any> => client.patch('/notifications/read-all').then((r) => r.data),
};

// ─── Itinerary ───────────────────────────────────────────────────────────────

export const itineraryAPI = {
  getMyItinerary: (): Promise<{ items: ItineraryItem[] }> =>
    client.get('/itinerary/me').then((r) => ({ items: asArray<ItineraryItem>(r.data?.items) })),
};

// ─── Queues ──────────────────────────────────────────────────────────────────

export const queuesAPI = {
  joinQueue: (venueId: string): Promise<QueueEntry> =>
    client.post('/queues', { venueId }).then((r) => r.data?.queue ?? r.data),

  getQueuePosition: (
    queueId: string,
  ): Promise<{ position: number; status: string; createdAt: string }> =>
    client.get(`/queues/${queueId}`).then((r) => {
      const d = r.data?.queue ?? r.data ?? {};
      return {
        position: Number(d.position ?? 0),
        status: String(d.status ?? 'WAITING'),
        createdAt: String(d.createdAt ?? new Date().toISOString()),
      };
    }),

  checkIn: (queueId: string): Promise<QueueEntry> =>
    client.post(`/queues/${queueId}/check-in`).then((r) => r.data?.queue ?? r.data),

  cancel: (queueId: string): Promise<any> =>
    client.patch(`/queues/${queueId}/cancel`).then((r) => r.data),
};

// ─── Menu & orders ───────────────────────────────────────────────────────────

export const menuAPI = {
  // Returns a BARE array — the only endpoint in this file that does not wrap.
  getMenu: (venueId: string, category: string): Promise<MenuItem[]> =>
    client.get(`/menu/${venueId}`, { params: { category } }).then((r) =>
      Array.isArray(r.data) ? (r.data as MenuItem[]) : asArray<MenuItem>(r.data?.menu),
    ),
};

export const ordersAPI = {
  // bookingId is required — orders attach to an existing confirmed table booking,
  // they are not placed against a bare venueId/tableId pair.
  createOrder: (
    bookingId: string,
    items: { id: string; name: string; price: number; quantity: number }[],
    tableInfo?: {
      type: 'table';
      tableInfo: { tableId: string; tableName: string; category: string; venueId: string };
    },
  ): Promise<any> =>
    client.post('/orders', { bookingId, items, ...(tableInfo ?? {}) }).then((r) => r.data),
};

// ─── Tickets ─────────────────────────────────────────────────────────────────
// A ticket IS a booking — getTicket returns BackendBooking, and the booking id
// doubles as the ticket id.

export const ticketsAPI = {
  createTicket: (payload: {
    eventId: string;
    venueId?: string | null;
    quantity: number;
    // BARE ticket total (quantity x ticketPrice), no service charge.
    price: number;
  }): Promise<BackendBooking> =>
    client.post('/tickets', payload).then((r) => r.data?.booking ?? r.data?.ticket ?? r.data),

  getTicket: (ticketId: string): Promise<BackendBooking> =>
    client.get(`/tickets/${ticketId}`).then((r) => r.data?.ticket ?? r.data),

  cancelTicket: (ticketId: string): Promise<any> =>
    client.patch(`/tickets/${ticketId}/cancel`).then((r) => r.data),
};

// ─── Wallet ──────────────────────────────────────────────────────────────────

export const walletAPI = {
  getWallet: (): Promise<Wallet> => client.get('/wallet').then((r) => r.data?.wallet ?? r.data),

  getTransactions: (): Promise<{ entries: WalletTransaction[] }> =>
    client
      .get('/wallet/transactions')
      .then((r) => ({ entries: asArray<WalletTransaction>(r.data?.entries) })),

  // Verified by Paystack reference — the same pattern WalletScreen already uses
  // for popup.checkout's onSuccess.
  fundWallet: (amount: number, reference?: string): Promise<{ balance: number; message: string }> =>
    client.post('/wallet/fund', { amount, reference }).then((r) => ({
      balance: Number(r.data?.balance ?? 0),
      message: String(r.data?.message ?? 'Wallet funded.'),
    })),
};

// ─── Payments ────────────────────────────────────────────────────────────────
// The only call that is polymorphic across all four booking types and not a
// booking mutation, which is why it gets its own namespace rather than joining
// bookingsAPI (whose surviving surface is read-only).

export const paymentsAPI = {
  // Confirms a Paystack reference server-side. PaymentScreen retries this and
  // also polls bookingsAPI.getBookingById as a fallback, because the Paystack
  // webhook usually lands even when this endpoint is unavailable.
  verifyPayment: (reference: string, bookingId: string): Promise<PaymentVerification> =>
    client.post('/payments/verify', { reference, bookingId }).then((r) => {
      const d = r.data ?? {};
      return {
        verified: d.verified === true || d.status === 'success',
        status: String(d.status ?? 'unknown'),
        reference: String(d.reference ?? reference),
        booking: d.booking,
        message: d.message,
      };
    }),
};
