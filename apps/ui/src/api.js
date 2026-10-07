// api.js
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  // 1. Sanitize auth token (prevent sending literal "undefined" or "null" strings)
  const rawToken = localStorage.getItem("authToken");
  const token = rawToken && rawToken !== "undefined" && rawToken !== "null" ? rawToken : null;

  if (!token && rawToken) {
    localStorage.removeItem("authToken");
  }

  // 2. Normalize pathing: resolve /v1/ or /api/v1/ mismatches to match Fastify route structure (/api/...)
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  cleanPath = cleanPath.replace(/^\/api\/v1\//, "/api/").replace(/^\/v1\//, "/");
  const fullPath = cleanPath.startsWith("/api/") || cleanPath === "/api" ? cleanPath : `/api${cleanPath}`;

  const url = `${API_URL}${fullPath}`;

  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers = { ...(options.headers || {}) };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let body = options.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
  const isArrayBuffer = typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer;

  if (body != null && !isFormData && !isBlob && !isArrayBuffer) {
    if (typeof body === "object") {
      body = JSON.stringify(body);
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
    }
  }

  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body,
      signal: controller.signal,
      credentials: options.credentials ?? "include",
    });
    clearTimeout(timeout);

    if (res.status === 204) return null;

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (res.status === 401) {
      localStorage.removeItem("authToken");
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));

      const err = new Error(data?.message || "Session expired. Please log in again.");
      err.status = 401;
      err.body = data;
      throw err;
    }

    if (res.status === 404) {
      const err = new Error(`API route not found: ${fullPath}`);
      err.status = 404;
      err.body = data;
      throw err;
    }

    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || res.statusText || `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = data;
      throw err;
    }

    return data;
  } catch (err) {
    clearTimeout(timeout);

    // 3. Preserve custom HTTP status errors (so auth context providers can read err.status)
    if (err && err.status) {
      throw err;
    }

    if (err && err.name === "AbortError") {
      const timeoutErr = new Error("Request timed out");
      timeoutErr.status = 408;
      throw timeoutErr;
    }

    throw new Error(err?.message || "Network request failed");
  } finally {
    clearTimeout(timeout);
  }
}