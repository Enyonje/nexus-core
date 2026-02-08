/**
 * Classify error into categories for retry logic
 */
export function classifyFailure(error) {
  if (!error) return "unknown";

  const msg = error.message?.toLowerCase() || "";

  if (msg.includes("timeout") || msg.includes("econnreset") || msg.includes("network")) {
    return "transient"; // retry after backoff
  }

  if (msg.includes("permission") || msg.includes("unauthorized") || msg.includes("forbidden")) {
    return "fatal"; // do not retry
  }

  if (msg.includes("not found") || msg.includes("invalid")) {
    return "fatal"; // unrecoverable
  }

  return "retryable"; // default safe fallback
}

/**
 * Compute exponential backoff with cap
 */
export function computeBackoff(attempt) {
  const base = 2000; // 2s
  const max = 60000; // 60s

  const delay = Math.min(base * Math.pow(2, attempt), max);
  return new Date(Date.now() + delay); // safe for Postgres TIMESTAMP
}