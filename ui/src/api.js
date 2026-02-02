const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  // Build headers
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Only set Content-Type if body exists and is not FormData
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include", // ✅ supports cookie/session auth
  });

  // Handle auth failure
  if (res.status === 401) {
    localStorage.removeItem("token");
    throw new Error("Session expired. Please log in again.");
  }

  // Handle not found
  if (res.status === 404) {
    throw new Error(`API route not found: ${path}`);
  }

  // Handle other errors
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {
      const text = await res.text();
      if (text) msg = text;
    }
    throw new Error(msg);
  }

  // Handle empty responses (204)
  if (res.status === 204) return null;

  return res.json();
}