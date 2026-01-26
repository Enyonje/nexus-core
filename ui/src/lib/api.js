const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Only set Content-Type if body exists
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Auto-logout on auth failure
  if (res.status === 401) {
    localStorage.removeItem("token");
  }

  if (!res.ok) {
    let msg = "Request failed";
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch {}
    throw new Error(msg);
  }

  // Handle empty responses (204)
  if (res.status === 204) return null;

  return res.json();
}
