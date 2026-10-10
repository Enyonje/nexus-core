// src/lib/api.js
import axios from "axios";

// Base URL without trailing /api to prevent Axios absolute-path replacement
const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_API_URL ||
  import.meta.env.VITE_API_URL ||
  "https://nexus-core-a0px.onrender.com"
).replace(/\/api\/?$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // 45s for Render cold-starts
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
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

  // Automatically ensure all endpoints route through /api
  let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  if (!cleanEndpoint.startsWith("/api")) {
    cleanEndpoint = `/api${cleanEndpoint}`;
  }

  // Safely parse JSON strings passed to body
  let data = options.body;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      // Keep original string if not valid JSON
    }
  }

  const config = {
    url: cleanEndpoint,
    method,
    data,
    params: options.params,
    timeout: options.timeout || 45000,
    ...options,
  };

  return apiClient(config);
};

export const safeApiFetch = async (endpoint, options = {}, addToast = null) => {
  try {
    const data = await apiFetch(endpoint, options);
    return { data, error: null };
  } catch (err) {
    const message = err.message || "An unexpected error occurred";
    if (typeof addToast === "function") {
      addToast(message, "error");
    }
    return { data: null, error: err };
  }
};

export default apiFetch;