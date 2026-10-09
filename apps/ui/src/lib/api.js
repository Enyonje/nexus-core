// src/lib/api.js

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_BACKEND_API_URL || import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.replace(/\/$/, "");
  }

  // If running in browser and NOT localhost, route directly to backend target
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return "https://nexus-core-a0px.onrender.com";
  }

  // Local development fallback
  return "http://localhost:3001";
};

const API_URL = getBaseUrl();

export async function apiFetch(path, options = {}) {
  // Check token across supported storage keys
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  // Normalize path and handle legacy /api/v1 route rewrites
  let fullPath = path.startsWith("/") ? path : `/${path}`;
  if (fullPath.startsWith("/api/v1/")) {
    fullPath = fullPath.replace("/api/v1/", "/api/");
  } else if (!fullPath.startsWith("/api/")) {
    fullPath = `/api${fullPath}`;
  }

  // Construct absolute URL
  const url = fullPath.startsWith("http") ? fullPath : `${API_URL}${fullPath}`;

  const controller = new AbortController();
  // 45s timeout to account for Render backend cold starts
  const timeoutMs = options.timeout ?? 45000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers = { ...(options.headers || {}) };
  if (token && !headers.Authorization && !headers.authorization) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let body = options.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
  const isArrayBuffer = typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer;

  if (body != null && !isFormData && !isBlob && !isArrayBuffer) {
    if (typeof body === "object") {
      try {
        body = JSON.stringify(body);
        if (!headers["Content-Type"] && !headers["content-type"]) {
          headers["Content-Type"] = "application/json";
        }
      } catch (e) {
        clearTimeout(timeout);
        throw new Error("Failed to serialize request body");
      }
    } else if (typeof body === "string") {
      const ct = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
      if (ct.includes("application/json")) {
        try {
          JSON.parse(body);
        } catch {
          delete headers["Content-Type"];
          delete headers["content-type"];
        }
      } else if (!ct) {
        try {
          JSON.parse(body);
          headers["Content-Type"] = "application/json";
        } catch {
          // Leave plain string
        }
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
      localStorage.removeItem("access_token");
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");

      window.dispatchEvent(new CustomEvent("auth:unauthorized"));

      const err = new Error("Session expired. Please log in again.");
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
      const msg =
        (data && (data.error || data.message)) ||
        res.statusText ||
        `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = data;
      throw err;
    }

    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err && err.name === "AbortError") throw new Error("Request timed out");
    if (err && (err.status || err.body)) throw err;
    throw new Error(err?.message || "Network request failed");
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Safe wrapper around apiFetch that catches errors and optionally triggers a toast.
 */
export async function safeApiFetch(path, options = {}, addToast) {
  try {
    return await apiFetch(path, options);
  } catch (err) {
    console.error("safeApiFetch error:", err);
    if (addToast) {
      addToast(err.message || "Request failed", "error");
    }
    return null;
  }
}

export default apiFetch;