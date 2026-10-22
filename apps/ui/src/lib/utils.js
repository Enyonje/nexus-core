// src/utils.js

/**
 * Format a timestamp into a human-readable string.
 * @param {string|number|Date} ts - Timestamp or Date object
 * @returns {string} formatted date/time
 */
export function formatDate(ts) {
  if (!ts) return "—";
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid date";
  }
}

/**
 * Truncate a string to a given length and append ellipsis.
 * @param {string} str - Input string
 * @param {number} length - Max length
 * @returns {string} truncated string
 */
export function truncate(str, length = 20) {
  if (!str || typeof str !== "string") return "";
  return str.length > length ? str.slice(0, length) + "…" : str;
}

/**
 * Map execution/step status to a color style (case-insensitive).
 * Synchronized with dark-mode UI theme badges.
 * @param {string} status - Status string
 * @returns {object} style object
 */
export function statusStyle(status) {
  if (!status) return { background: "rgba(100, 116, 139, 0.15)", color: "#94a3b8" };
  const s = String(status).toUpperCase();
  const styles = {
    RUNNING: { background: "rgba(6, 182, 212, 0.15)", color: "#22d3ee" }, // cyan
    COMPLETED: { background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }, // green/emerald
    SUCCESS: { background: "rgba(16, 185, 129, 0.15)", color: "#34d399" },
    FAILED: { background: "rgba(244, 63, 94, 0.15)", color: "#fb7185" }, // red/rose
    ERROR: { background: "rgba(244, 63, 94, 0.15)", color: "#fb7185" },
    PENDING: { background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }, // yellow/amber
    DEFAULT: { background: "rgba(100, 116, 139, 0.15)", color: "#94a3b8" }, // gray/slate
  };
  return styles[s] || styles.DEFAULT;
}

/**
 * Format a number as currency.
 * @param {number} amount - Amount in dollars
 * @returns {string} formatted currency
 */
export function formatCurrency(amount) {
  if (typeof amount !== "number" || isNaN(amount)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}