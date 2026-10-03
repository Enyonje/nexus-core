// src/utils.js

/**
 * Format a timestamp into a human-readable string.
 * @param {string|number|Date} ts - Timestamp or Date object
 * @returns {string} formatted date/time
 */
export function formatDate(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
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
  if (!str) return "";
  return str.length > length ? str.slice(0, length) + "…" : str;
}

/**
 * Map execution/step status to a color style.
 * Useful for consistent badge styling.
 * @param {string} status - Status string
 * @returns {object} style object
 */
export function statusStyle(status) {
  const styles = {
    RUNNING: { background: "#fef3c7", color: "#92400e" }, // yellow
    COMPLETED: { background: "#d1fae5", color: "#065f46" }, // green
    FAILED: { background: "#fee2e2", color: "#991b1b" },   // red
    DEFAULT: { background: "#e5e7eb", color: "#374151" },  // gray
  };
  return styles[status] || styles.DEFAULT;
}