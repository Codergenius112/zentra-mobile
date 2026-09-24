import React, {
  createContext, useCallback, useContext, useMemo, useRef, useState,
} from 'react';
import {
  ActivityIndicator, Alert, Linking, Modal, StyleSheet, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { PaystackProps } from 'react-native-paystack-webview';

type PaystackParams = PaystackProps.PaystackParams;
type PaystackTransactionResponse = PaystackProps.PaystackTransactionResponse;
type Currency = PaystackProps.Currency;
type PaymentChannels = PaystackProps.PaymentChannels;

/**
 * ─── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 * The stock PaystackProvider in react-native-paystack-webview mounts a fresh
 * Modal + WebView on every checkout and loads an HTML page that downloads
 * https://js.paystack.co/v2/inline.js from scratch. That is three cold starts
 * stacked at the exact moment the user taps "Pay": Modal presentation,
 * WKWebView/WebView creation, and a scripted CDN fetch — which is why the
 * checkout sheet takes seconds to appear.
 *
 * This provider keeps the SAME public API (PaystackProvider props,
 * usePaystack().popup.checkout/newTransaction, naira-in/×100-inside amount
 * contract) but keeps one WebView alive for the life of the app:
 *
 *   1. The WebView is mounted at app start, inside a permanently-mounted Modal
 *      (visible=false), and never unmounted between transactions, so the
 *      expensive WKWebView creation happens once, off the critical path.
 *   2. The HTML pre-loads inline.js at startup. A transaction is triggered
 *      later by postMessage — no page reload, script already downloaded and
 *      the CDN connection warm.
 *   3. If checkout is requested before the page finished booting, the exact
 *      start payload is queued and fired on the 'bridge_ready' message; a
 *      watchdog reloads the WebView once, then fails visibly rather than
 *      hanging the calling screen.
 *
 * Callbacks are matched per-transaction via a map keyed by reference, so a
 * stale overlay from an abandoned session can never deliver a result into the
 * wrong screen — messages with unknown references are ignored outright.
 *
 * NOTE on SRI: inline.js is intentionally loaded without an integrity hash —
 * Paystack rotates that file server-side and publishes no hash, so pinning one
 * would break checkout on their next deploy. The library does the same. The
 * script is only ever fetched over HTTPS from js.paystack.co.
 */

type TransactionHandlers = {
  onSuccess: (data: PaystackTransactionResponse) => void;
  onCancel: () => void;
  onError?: (err: any) => void;
  onLoad?: (res: any) => void;
};

const BRIDGE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Secure Payment</title>
</head>
<body style="background-color:#fff;height:100vh;margin:0">
  <script src="https://js.paystack.co/v2/inline.js" onerror="window.__zkScriptFailed()"></script>
  <script>
    var RN = window.ReactNativeWebView;

    function post(type, payload) {
      try { RN.postMessage(JSON.stringify({ type: type, payload: payload || {} })); } catch (e) {}
    }

    function fire(msg) {
      var data = msg.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { return; }
      }
      if (!data || data.type !== 'start') return;
      var p = data.payload || {};
      var ref = p.reference;

      function done(type) {
        return function (resp) { post(type, { reference: ref, resp: resp }); };
      }

      // Fresh PaystackPop per transaction: avoids any one-shot state inside the
      // overlay while reusing the already-downloaded script.
      try {
        var pop = new PaystackPop();
        pop.checkout(Object.assign({}, p, {
          onSuccess: done('success'),
          onCancel: done('cancel'),
          onClose: done('cancel'),
          onError: done('error'),
          onLoad: done('load')
        }));
      } catch (err) {
        post('error', { reference: ref, resp: { message: String(err) } });
      }
    }

    window.addEventListener('message', fire);

    window.__zkScriptFailed = function () { post('script_failed'); };

    if (window.PaystackPop) {
      post('bridge_ready');
    } else {
      window.addEventListener('load', function () {
        post(window.PaystackPop ? 'bridge_ready' : 'script_failed');
      });
    }
  </script>
</body>
</html>
`;

// Mirrors the library's built-in deep-link hosts; extra hosts come from props.
const DEFAULT_DEEP_LINK_HOSTS = ['https://joinzap.com/app/'];

const shouldHandleExternally = (url: string, hosts: Array<string | RegExp>): boolean =>
  !!url && hosts.some((m) => (typeof m === 'string' ? url.indexOf(m) === 0 : m.test(url)));

const openExternalUrl = async (url: string) => {
  try {
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
  } catch {}
};

type Popup = {
  checkout: (params: PaystackParams) => void;
  newTransaction: (params: PaystackParams) => void;
};

const PaystackContext = createContext<{ popup: Popup } | null>(null);

export const usePaystack = (): { popup: Popup } => {
  const ctx = useContext(PaystackContext);
  if (!ctx) throw new Error('usePaystack must be used within a PaystackProvider');
  return ctx;
};

type Props = Omit<PaystackProps.PaystackProviderProps, 'children'> & { children: React.ReactNode };

// Kept identical to the library's multiply-by-100 contract documented in
// PaymentScreen: callers pass NAIRA, Paystack receives kobo.
const toKobo = (naira: number) => Math.round(naira * 100);

const buildStartPayload = (
  publicKey: string,
  currency: Currency | undefined,
  channels: PaymentChannels,
  reference: string,
  params: PaystackParams,
) => ({
  key: publicKey,
  email: params.email,
  amount: toKobo(params.amount),
  reference,
  ...(currency ? { currency } : {}),
  ...(params.metadata ? { metadata: params.metadata } : {}),
  ...(channels ? { channels } : {}),
  ...(params.plan ? { plan: params.plan } : {}),
  ...(params.invoice_limit ? { invoice_limit: params.invoice_limit } : {}),
  ...(params.subaccount ? { subaccount: params.subaccount } : {}),
  ...(params.split_code ? { split_code: params.split_code } : {}),
  ...(params.split ? { split: params.split } : {}),
});

export const PaystackProvider = ({
  publicKey,
  currency,
  defaultChannels = ['card'],
  deepLinkHosts = [],
  debug = false,
  children,
  onGlobalSuccess,
  onGlobalCancel,
}: Props) => {
  const [visible, setVisible] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [awaitingOverlay, setAwaitingOverlay] = useState(false);

  const webviewRef = useRef<WebView>(null);
  const bridgeReadyRef = useRef(false);
  const reloadTriedRef = useRef(false);
  const handlersRef = useRef<Record<string, TransactionHandlers>>({});
  const activeRefRef = useRef<string | null>(null);
  // Queued start: full payload stored so the flush needs nothing re-derived.
  const queuedStartRef = useRef<{ reference: string; payload: any } | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedDeepLinkHosts = useMemo(
    () => [...DEFAULT_DEEP_LINK_HOSTS, ...deepLinkHosts],
    [deepLinkHosts],
  );

  const log = useCallback((...args: any[]) => { if (debug) console.log(...args); }, [debug]);

  const clearWatchdog = () => {
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
  };

  const sendStart = useCallback((payload: any) => {
    activeRefRef.current = payload.reference;
    webviewRef.current?.postMessage(JSON.stringify({ type: 'start', payload }));
  }, []);

  // Terminal for one transaction: fire its handler, forget it, close the modal.
  const settleTransaction = useCallback(
    (reference: string | undefined, outcome: 'success' | 'cancel' | 'error', resp: any) => {
      const key = reference ?? activeRefRef.current ?? undefined;
      const handlers = key ? handlersRef.current[key] : undefined;
      if (!key || !handlers) {
        // Unknown/stale reference (e.g. an abandoned overlay reporting late) —
        // never let it settle whatever transaction is currently active.
        log('[Paystack] ignored message for unknown reference:', reference);
        return;
      }
      delete handlersRef.current[key];
      activeRefRef.current = null;
      queuedStartRef.current = null;
      clearWatchdog();
      setAwaitingOverlay(false);
      setVisible(false);
      if (outcome === 'success') {
        handlers.onSuccess(resp as PaystackTransactionResponse);
        onGlobalSuccess?.(resp as PaystackTransactionResponse);
      } else if (outcome === 'cancel') {
        handlers.onCancel();
        onGlobalCancel?.();
      } else {
        // The stock library never surfaced 'error' (it just closed the modal).
        // Here the caller's own onError is available, so prefer it and fall
        // back to cancel semantics — either way, never hang the charging UI.
        log('[Paystack] transaction error:', resp);
        if (handlers.onError) handlers.onError(resp);
        else handlers.onCancel();
      }
    },
    [log, onGlobalSuccess, onGlobalCancel],
  );

  const openTransaction = useCallback(
    (params: PaystackParams) => {
      const reference = params.reference || `ref_${Date.now()}`;
      handlersRef.current[reference] = {
        onSuccess: params.onSuccess,
        onCancel: params.onCancel,
        onError: params.onError,
        onLoad: params.onLoad,
      };
      setAwaitingOverlay(true);
      setVisible(true);

      const payload = buildStartPayload(publicKey, currency, defaultChannels, reference, params);

      if (bridgeReadyRef.current) {
        queuedStartRef.current = null;
        sendStart(payload);
      } else {
        // Page still booting — flush from the bridge_ready message.
        queuedStartRef.current = { reference, payload };
      }

      clearWatchdog();
      watchdogRef.current = setTimeout(() => {
        // One silent reload, then a visible failure. A hang here would strand
        // PaymentScreen on "Waiting for your bank…" forever.
        if (!bridgeReadyRef.current) {
          if (!reloadTriedRef.current) {
            reloadTriedRef.current = true;
            webviewRef.current?.reload();
          } else {
            settleTransaction(reference, 'error', { message: 'The secure payment page could not be loaded. Check your connection and try again.' });
          }
        } else {
          settleTransaction(reference, 'error', { message: 'The payment window failed to open. Please try again.' });
        }
      }, 12000);
    },
    [publicKey, currency, defaultChannels, sendStart, settleTransaction],
  );

  const validateAndOpen = useCallback((params: PaystackParams) => {
    // Same guard the library's validateParams applies, but as the caller's
    // screen still checks email/amount, this only catches programmer error.
    if (!params.email || typeof params.amount !== 'number' || !(params.amount > 0)) {
      Alert.alert('Payment Error', 'Paystack requires an email and an amount greater than zero.');
      return;
    }
    openTransaction(params);
  }, [openTransaction]);

  const popup = useMemo<Popup>(() => ({
    checkout: validateAndOpen,
    // At the bridge level newTransaction is identical: a fresh PaystackPop
    // instance is created per start message anyway.
    newTransaction: validateAndOpen,
  }), [validateAndOpen]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let msg: any;
      try { msg = JSON.parse(event.nativeEvent.data); } catch { return; }
      const { type, payload } = msg ?? {};
      const reference = payload?.reference;
      const resp = payload?.resp;

      switch (type) {
        case 'bridge_ready': {
          log('[Paystack] bridge ready');
          bridgeReadyRef.current = true;
          setBridgeReady(true);
          reloadTriedRef.current = false;
          const queued = queuedStartRef.current;
          if (queued && handlersRef.current[queued.reference]) {
            queuedStartRef.current = null;
            sendStart(queued.payload);
          }
          break;
        }
        case 'script_failed': {
          // Boot-time failure with no transaction waiting: only worth an
          // alert if a checkout is actually queued behind it.
          const queued = queuedStartRef.current;
          if (queued && handlersRef.current[queued.reference]) {
            settleTransaction(queued.reference, 'error', { message: 'The secure payment page could not be loaded. Check your connection and try again.' });
          }
          break;
        }
        case 'success':
          settleTransaction(reference, 'success', resp);
          break;
        case 'cancel':
          settleTransaction(reference, 'cancel', resp);
          break;
        case 'error':
          settleTransaction(reference, 'error', resp);
          break;
        case 'load': {
          // Overlay is up — from here the bank/3DS flow owns the wait, which
          // can be slow and legitimate. Drop the watchdog so it is never
          // mistaken for a hang, and hide our own spinner.
          clearWatchdog();
          setAwaitingOverlay(false);
          if (reference) handlersRef.current[reference]?.onLoad?.(resp);
          break;
        }
        default:
          break;
      }
    },
    [log, sendStart, settleTransaction],
  );

  return (
    <PaystackContext.Provider value={{ popup }}>
      {children}
      {/* Mounted for the whole app lifetime; only `visible` toggles. Unmounting
          the WebView between payments would recreate the exact cold start this
          file exists to eliminate. */}
      <Modal
        visible={visible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => settleTransaction(undefined, 'cancel', undefined)}
      >
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <WebView
            ref={webviewRef}
            originWhitelist={['*']}
            source={{ html: BRIDGE_HTML }}
            javaScriptEnabled
            domStorageEnabled
            onMessage={handleMessage}
            onShouldStartLoadWithRequest={(request) => {
              const url = request.url ?? '';
              if (shouldHandleExternally(url, resolvedDeepLinkHosts)) {
                void openExternalUrl(url);
                return false;
              }
              return true;
            }}
            style={styles.webview}
          />
          {visible && awaitingOverlay && (
            <View style={styles.loaderOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color="#4A90D9" />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </PaystackContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  webview: { flex: 1, backgroundColor: '#fff' },
  loaderOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
});
