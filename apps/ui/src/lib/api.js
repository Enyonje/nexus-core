// src/lib/api.js
import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_SUPPORTOPS_API_URL ||
  import.meta.env.VITE_BACKEND_API_URL ||
  import.meta.env.VITE_API_URL ||
  "https://nexus-core-a0px.onrender.com"
).replace(/\/api\/?$/, "");

const TOKEN_KEYS = ["token", "authToken", "access_token"];

let refreshPromise = null;
let unauthorizedDispatched = false;

function getStoredToken() {
  for (const key of TOKEN_KEYS) {
    const token = localStorage.getItem(key);
    if (token) return token;
  }

  return null;
}

function storeToken(token) {
  if (!token) return;

  localStorage.setItem("token", token);
  localStorage.setItem("authToken", token);
}

function clearStoredAuth() {
  TOKEN_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem("user");
  localStorage.removeItem("subscription");
  localStorage.removeItem("activeOrgId");
  localStorage.removeItem("orgId");
}

function dispatchUnauthorized() {
  if (unauthorizedDispatched) return;

  unauthorizedDispatched = true;
  clearStoredAuth();
  window.dispatchEvent(new Event("auth:unauthorized"));
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach the access token to requests.
apiClient.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  const orgId =
    localStorage.getItem("activeOrgId") ||
    localStorage.getItem("orgId");

  if (orgId) {
    config.headers = config.headers || {};
    config.headers["X-Org-Id"] = orgId;
  }

  if (window.location.pathname.startsWith("/supportops")) {
    config.headers = config.headers || {};
    config.headers["X-App-Slug"] = "supportops";
  }

  return config;
});

const AUTH_ENDPOINTS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/crossborder/auth/login",
  "/crossborder/auth/register",
];

function isAuthEndpoint(url = "") {
  return AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post(
      `${API_BASE_URL}/api/auth/refresh`,
      {},
      {
        withCredentials: true,
        timeout: 45000,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
    .then((response) => {
      const token =
        response.data?.token ||
        response.data?.accessToken ||
        response.data?.data?.token;

      if (!token) {
        throw new Error("Refresh response did not include an access token");
      }

      storeToken(token);
      unauthorizedDispatched = false;

      return token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => {
    // Axios interceptor consumers receive the response body.
    return response.data;
  },

  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config || {};
    const url = originalRequest.url || "";

    // Refresh only once for a failed authenticated request.
    if (
      status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(url)
    ) {
      originalRequest._retry = true;

      try {
        const token = await refreshAccessToken();

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        dispatchUnauthorized();
        throw refreshError;
      }
    }

    // A failed login is not the same as an expired existing session.
    // A 403 indicates forbidden access and should not automatically log out.
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "API request failed";

    return Promise.reject(new Error(message));
  }
);

export const apiFetch = async (endpoint, options = {}) => {
  const method = (options.method || "GET").toLowerCase();

  const isAbsoluteUrl = /^https?:\/\//i.test(endpoint);
  let cleanEndpoint = isAbsoluteUrl
    ? endpoint
    : (endpoint.startsWith("/") ? endpoint : `/${endpoint}`);

  if (!isAbsoluteUrl && !cleanEndpoint.startsWith("/api/") && cleanEndpoint !== "/api") {
    cleanEndpoint = `/api${cleanEndpoint}`;
  }

  let requestData =
    options.body !== undefined
      ? options.body
      : options.data;

  if (typeof requestData === "string") {
    try {
      requestData = JSON.parse(requestData);
    } catch {
      // Preserve non-JSON string bodies.
    }
  }

  return apiClient({
    url: cleanEndpoint,
    method,
    data: requestData,
    params: options.params,
    timeout: options.timeout || 45000,
    headers: options.headers || {},
    withCredentials: true,
    signal: options.signal,
  });
};

export const safeApiFetch = async (
  endpoint,
  options = {},
  addToast = null
) => {
  try {
    const data = await apiFetch(endpoint, options);
    return { data, error: null };
  } catch (err) {
    const message =
      err.message || "An unexpected error occurred";

    if (typeof addToast === "function") {
      addToast(message, "error");
    }

    return { data: null, error: err };
  }
};

export default apiFetch;
