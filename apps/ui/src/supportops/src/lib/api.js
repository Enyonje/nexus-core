import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_BACKEND_API_URL ||
    import.meta.env.VITE_API_URL ||
    "https://nexus-core-a0px.onrender.com",
  withCredentials: true,
  timeout: 15000,
});

// Attach JWT automatically (checks access_token, token, and authToken)
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken");

    if (token && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global auth error handling and error status normalization
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // Attach HTTP status code directly to error object for catch block checks (err.status)
    if (status) {
      error.status = status;
    }

    if (status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");

      // Dispatch custom event for state providers
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));

      // Prevent redirect loops on public authentication pages
      const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
      const isPublicRoute = publicRoutes.some((route) =>
        window.location.pathname.startsWith(route)
      );

      if (!isPublicRoute) {
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

  let data = body;
  // Auto-parse stringified JSON payloads if passed from legacy fetch callers
  if (typeof body === "string") {
    try {
      data = JSON.parse(body);
    } catch {
      data = body;
    }
  }

  const response = await api({
    method,
    url,
    data,
    headers,
    signal,
  });

  return response.data;
};

export default api;