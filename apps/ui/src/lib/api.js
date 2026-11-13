// src/lib/api.js — one HTTP client for every product.
//
// Requests go to the same origin by default (/api/...). On Vercel, vercel.json forwards /api to the
// API server, and in development Vite proxies it, so the per-product refresh cookies are first-party.
// Set VITE_API_URL only if the API must be called cross-origin.
//
//   apiFetch("/goals")                                  -> Nexus Core session
//   apiFetch("/compliance/billing/subscription", { product: "compliance" })
import axios from "axios";
import { tokenStore } from "../auth/tokenStore";

export const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "").replace(/\/$/, "");
const DEFAULT_PRODUCT = "nexus-core";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

const refreshing = new Map();

/** Exchanges the product's refresh cookie for a new access token. Resolves to the session body or null. */
export function refreshSession(product = DEFAULT_PRODUCT) {
  if (refreshing.has(product)) return refreshing.get(product);
  const promise = axios
    .post(`${API_BASE_URL}/api/${product}/auth/refresh`, {}, { withCredentials: true, timeout: 20000 })
    .then((res) => {
      tokenStore.set(product, res.data?.token || null);
      return res.data?.token ? res.data : null;
    })
    .catch(() => {
      tokenStore.clear(product);
      return null;
    })
    .finally(() => refreshing.delete(product));
  refreshing.set(product, promise);
  return promise;
}

apiClient.interceptors.request.use((config) => {
  const product = config.product || DEFAULT_PRODUCT;
  const token = tokenStore.get(product);
  config.headers = config.headers || {};
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  config.headers["X-App-Slug"] = product;
  return config;
});

const isAuthEndpoint = (url = "") => /\/auth\/(login|register|refresh|logout|forgot-password|reset-password)/.test(url);

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const status = error.response?.status;
    const original = error.config || {};
    const product = original.product || DEFAULT_PRODUCT;

    if (status === 401 && !original._retry && !isAuthEndpoint(original.url)) {
      original._retry = true;
      const session = await refreshSession(product);
      if (session?.token) {
        original.headers = { ...(original.headers || {}), Authorization: `Bearer ${session.token}` };
        return apiClient(original);
      }
      window.dispatchEvent(new CustomEvent(`${product}:auth:unauthorized`));
    }

    const data = error.response?.data || {};
    const err = new Error(data.message || data.error || error.message || "Request failed");
    err.status = status;
    err.code = data.error;
    err.data = data;
    return Promise.reject(err);
  }
);

export const apiFetch = (endpoint, options = {}) => {
  const isAbsolute = /^https?:\/\//i.test(endpoint);
  let url = isAbsolute ? endpoint : endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (!isAbsolute && !url.startsWith("/api/") && url !== "/api") url = `/api${url}`;

  let data = options.body !== undefined ? options.body : options.data;
  if (typeof data === "string") {
    try { data = JSON.parse(data); } catch { /* keep raw string */ }
  }

  return apiClient({
    url,
    method: (options.method || "GET").toLowerCase(),
    data,
    params: options.params,
    timeout: options.timeout || 30000,
    headers: options.headers || {},
    signal: options.signal,
    product: options.product || DEFAULT_PRODUCT,
  });
};

export const safeApiFetch = async (endpoint, options = {}, addToast = null) => {
  try {
    return { data: await apiFetch(endpoint, options), error: null };
  } catch (err) {
    if (typeof addToast === "function") addToast(err.message || "An unexpected error occurred", "error");
    return { data: null, error: err };
  }
};

export default apiFetch;
