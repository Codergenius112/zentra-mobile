/**
 * Comma-formats a number for display (e.g. 20000 -> "20,000").
 *
 * Hermes (React Native's default JS engine) does not fully support
 * locale-aware Number.prototype.toLocaleString() without a native
 * "intlSupport" build flag — without it, calls like
 * (20000).toLocaleString('en-NG') silently fall back to something like
 * "20000.00" instead of actually inserting thousand separators. Enabling
 * that flag requires a native rebuild, so this is a dependency-free
 * replacement that works immediately in Expo Go and on any Hermes build.
 */
export const formatNaira = (amount: number | string): string => {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(num)) return '0';
  const rounded = Math.round(num);
  const isNegative = rounded < 0;
  const digits = Math.abs(rounded).toString();
  const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return isNegative ? `-${withCommas}` : withCommas;
};
