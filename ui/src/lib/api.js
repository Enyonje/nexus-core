const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Core API fetch function
 */
export async function apiFetch(path, options = {}) {
  // 1. Check for token in localStorage
  const token = localStorage.getItem("authToken");

  // 2. Prepare headers
  const headers = {
    ...options.headers,
  };

  // 3. Explicitly attach Bearer token
  if (token) {
    headers["Authorization"] = `Bearer ${token.trim()}`;
  }

  // 4. Handle JSON body detection
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // 5. Normalizing Path (Ensuring no double /api/api)
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const apiPath = cleanPath.startsWith("/api") ? cleanPath : `/api${cleanPath}`;

  try {
    const res = await fetch(`${API_URL}${apiPath}`, {
      ...options,
      headers,
      // Removed credentials: "include" unless using HttpOnly cookies
      // Using JWT Bearer is usually sufficient for Fastify
    });

    // Handle Unauthorized (401)
    if (res.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      
      // Optional: Force a page refresh to trigger AuthProvider redirect
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login?error=session_expired";
      }
      throw new Error("Unauthorized: Session expired");
    }

    // Handle No Content
    if (res.status === 204) return null;

    // Parse Response
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.message || "Request failed");
    }

    return data;
  } catch (err) {
    // Catching network errors (like CORS or DNS issues on Render)
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error("Network error: Check your connection or Backend CORS settings");
    }
    throw err;
  }
}

/**
 * Safe wrapper around apiFetch with centralized error handling
 */
export async function safeApiFetch(path, options = {}, addToast) {
  try {
    return await apiFetch(path, options);
  } catch (err) {
    console.error(`[API Error] ${path}:`, err.message);
    if (addToast) {
      addToast(err.message, "error");
    }
    throw err;
  }
}