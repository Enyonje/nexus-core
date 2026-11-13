// Access tokens live in memory only, one slot per product. They last 15 minutes; the httpOnly
// refresh cookie (one per product, set by the API) restores them after a reload. Keeping them out of
// localStorage means a script injected into the page cannot read a long-lived credential.
const tokens = new Map();
const listeners = new Set();

export const tokenStore = {
  get: (product) => tokens.get(product) || null,
  set(product, token) {
    if (token) tokens.set(product, token);
    else tokens.delete(product);
    listeners.forEach((fn) => fn(product, token));
  },
  clear(product) {
    this.set(product, null);
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// Remove credentials written by the previous implementation so stale tokens are never sent.
try {
  ["token", "authToken", "access_token", "nexusCoreAccessToken", "user", "nexusCoreUser", "subscription", "nexusCoreSubscription"].forEach((k) => localStorage.removeItem(k));
} catch {
  /* storage unavailable */
}
