export function classifyFailure(error) {
  if (!error) return "unknown";

  const msg = error.message?.toLowerCase() || "";

  if (msg.includes("timeout") || msg.includes("econnreset")) {
    return "transient";
  }

  if (msg.includes("permission") || msg.includes("unauthorized")) {
    return "fatal";
  }

  return "retryable";
}

export function computeBackoff(attempt) {
  const base = 2000; // 2s
  const max = 60000; // 60s

  const delay = Math.min(base * Math.pow(2, attempt), max);
  return new Date(Date.now() + delay);
}
