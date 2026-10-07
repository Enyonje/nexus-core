import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL || import.meta.env.VITE_API_URL || "http://localhost:3001",
  withCredentials: true,
  timeout: 15000,
});

// Attach JWT automatically (checks both access_token and authToken for safety)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token") || localStorage.getItem("authToken");
  if (token && token !== "undefined" && token !== "null") {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global auth error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");

      // Dispatch custom event if AccessProvider listens to it, or handle redirect
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Named apiFetch wrapper around Axios for compatibility with fetch-style calls.
 */
export const apiFetch = async (url, options = {}) => {
  const { method = "GET", body, headers, signal } = options;

  const response = await api({
    method,
    url,
    data: body,
    headers,
    signal,
  });

  return response.data;
};

export default api;