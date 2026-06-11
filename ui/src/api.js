const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");

  // normalize path and ensure /api prefix if not present
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const fullPath = normalizedPath.startsWith("/api") ? normalizedPath : `/api${normalizedPath}`;
  const url = `${API_URL}${fullPath}`;

  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // start with caller headers then add auth
  const headers = { ...(options.headers || {}) };
  if (token && !headers.Authorization && !headers.authorization) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Prepare body safely (avoid double-stringify and avoid invalid JSON header)
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
      // If caller passed a string and Content-Type is application/json, validate it.
      const ct = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
      if (ct.includes("application/json")) {
        try {
          JSON.parse(body);
        } catch {
          // invalid JSON string but header set -> remove header to avoid Fastify 400
          delete headers["Content-Type"];
          delete headers["content-type"];
        }
      } else if (!ct) {
        // If no content-type and string looks like JSON, set header
        try {
          JSON.parse(body);
          headers["Content-Type"] = "application/json";
        } catch {
          // leave as plain text (no content-type)
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

    // 204 No Content
    if (res.status === 204) return null;

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (res.status === 401) {
      localStorage.removeItem("token");
      throw new Error("Session expired. Please log in again.");
    }

    if (res.status === 404) {
      throw new Error(`API route not found: ${fullPath}`);
    }

    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || res.statusText || `Request failed (${res.status})`;
      const err = new Error(msg);
      // attach server body for callers that want details
      err.status = res.status;
      err.body = data;
      throw err;
    }

    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") throw new Error("Request timed out");
    throw new Error(err.message || "Network request failed");
  } finally {
    clearTimeout(timeout);
  }
}
```// filepath: c:\Users\Administrator\nexus-core\ui\src\api.js
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken");

  // normalize path and ensure /api prefix if not present
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const fullPath = normalizedPath.startsWith("/api") ? normalizedPath : `/api${normalizedPath}`;
  const url = `${API_URL}${fullPath}`;

  const controller = new AbortController();
  const timeoutMs = options.timeout ?? 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // start with caller headers then add auth
  const headers = { ...(options.headers || {}) };
  if (token && !headers.Authorization && !headers.authorization) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Prepare body safely (avoid double-stringify and avoid invalid JSON header)
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
      // If caller passed a string and Content-Type is application/json, validate it.
      const ct = (headers["Content-Type"] || headers["content-type"] || "").toLowerCase();
      if (ct.includes("application/json")) {
        try {
          JSON.parse(body);
        } catch {
          // invalid JSON string but header set -> remove header to avoid Fastify 400
          delete headers["Content-Type"];
          delete headers["content-type"];
        }
      } else if (!ct) {
        // If no content-type and string looks like JSON, set header
        try {
          JSON.parse(body);
          headers["Content-Type"] = "application/json";
        } catch {
          // leave as plain text (no content-type)
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

    // 204 No Content
    if (res.status === 204) return null;

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (res.status === 401) {
      localStorage.removeItem("token");
      throw new Error("Session expired. Please log in again.");
    }

    if (res.status === 404) {
      throw new Error(`API route not found: ${fullPath}`);
    }

    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || res.statusText || `Request failed (${res.status})`;
      const err = new Error(msg);
      // attach server body for callers that want details
      err.status = res.status;
      err.body = data;
      throw err;
    }

    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") throw new Error("Request timed out");
    throw new Error(err.message || "Network request failed");
  } finally {
    clearTimeout(timeout);
  }
}