const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Core API fetch function
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("authToken");

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Only set Content-Type if body exists and not FormData
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // ✅ Ensure all paths go through /api
  const apiPath = path.startsWith("/api") ? path : `/api${path}`;

  const res = await fetch(`${API_URL}${apiPath}`, {
    ...options,
    headers,
    credentials: "include", // keep cookies/session if needed
  });

  // Auto-logout on auth failure
  if (res.status === 401) {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  }

  if (!res.ok) {
    let msg = "Request failed";
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {
      // ignore parse errors
    }
    throw new Error(msg);
  }

  // Handle empty responses (204)
  if (res.status === 204) return null;

  return res.json();
}

/**
 * Safe wrapper around apiFetch with centralized error handling
 */
export async function safeApiFetch(path, options = {}, addToast) {
  try {
    return await apiFetch(path, options);
  } catch (err) {
    console.error(`API error on ${path}:`, err);
    if (addToast) {
      addToast(err.message || "Something went wrong with the request", "error");
    }
    throw err; // rethrow so caller can still handle if needed
  }
}