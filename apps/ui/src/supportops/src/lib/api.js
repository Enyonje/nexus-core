// src/supportops/src/lib/api.js
//
// SupportOps API layer. Sections, in order:
//   1. Shared Nexus client (imported)
//   2. Configuration
//   3. Auth and storage helpers
//   4. URL resolution
//   5. Core request function  -> named export `api`
//   6. Shared-client passthrough -> named export `apiFetch`
//   7. Axios-style adapter for older screens -> default export

/* ---------- 1. Shared Nexus client ---------- */

import { apiFetch as sharedApiFetch } from "../../../lib/api";

/* ---------- 2. Configuration ---------- */

const API_BASE_URL = (
  import.meta.env.VITE_SUPPORTOPS_API_URL ||
  import.meta.env.VITE_BACKEND_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://nexus-core-a0px.onrender.com"
).replace(/\/api\/?$/, "");

const TOKEN_KEYS = ["token", "authToken", "access_token", "supportops_token"];
const ORG_KEYS = ["activeOrgId", "orgId"];

/* ---------- 3. Auth and storage helpers ---------- */

const readStore = (keys) => {
  try {
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
  } catch {
    /* storage blocked */
  }
  return null;
};

export const getToken = () => (typeof window === "undefined" ? null : readStore(TOKEN_KEYS));
export const getOrg = () => (typeof window === "undefined" ? null : readStore(ORG_KEYS));

export const isAbortError = (e) =>
  e?.name === "AbortError" || e?.name === "CanceledError" || e?.code === "ERR_CANCELED" || e?.code === "ABORT_ERR";

/* ---------- 4. URL resolution ---------- */

export function resolveUrl(url) {
  if (!url) return null;
  if (!url.startsWith("/")) return url;
  const path = url === "/api" || url.startsWith("/api/") ? url : `/api${url}`;
  return `${API_BASE_URL}${path}`;
}

/* ---------- 5. Core request function ---------- */

/** Throws an Error with a readable message and a .status number on any failure. */
async function request(url, { method = "GET", body, signal } = {}) {
  const full = resolveUrl(url);
  if (!full) throw Object.assign(new Error("Missing endpoint."), { status: 0 });

  const token = getToken();
  if (!token) throw Object.assign(new Error("Your session has expired. Sign in again to continue."), { status: 401 });
  const org = getOrg();

  let response;
  try {
    response = await fetch(full, {
      method,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(org ? { "X-Org-Id": org } : {}),
        "X-App-Slug": "supportops",
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw Object.assign(new Error("Can't reach the server. Check your connection and try again."), { status: 0 });
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!response.ok || data?.success === false) {
    const message =
      response.status === 401 ? "Your session has expired. Sign in again to continue."
        : response.status === 403 ? "You don't have permission to view this."
          : response.status === 404 ? "This endpoint wasn't found on the server."
            : data?.message || data?.error || `Request failed (${response.status})`;
    throw Object.assign(new Error(message), { status: response.status });
  }

  // A 200 with a non-JSON body usually means the request hit the frontend server, not the API.
  if (text && data === null) {
    throw Object.assign(new Error("The server returned an unexpected response. Check the API URL."), { status: response.status });
  }
  return data;
}

export { request as api };

/* ---------- 6. Shared-client passthrough ---------- */

export const apiFetch = (url, options = {}) => sharedApiFetch(url, options);

/* ---------- 7. Axios-style adapter for older screens ---------- */

const legacyRequest = (method) => async (url, bodyOrConfig, maybeConfig = {}) => {
  const isRead = method === "GET" || method === "DELETE";
  const options = isRead
    ? { ...(bodyOrConfig || {}), method }
    : { ...(maybeConfig || {}), method, body: bodyOrConfig };
  const data = await sharedApiFetch(url, options);
  return { data };
};

// Older SupportOps screens consume axios-style responses ({ data }).
// Authentication, refresh, tenant selection, timeout and error normalization
// are handled by the shared Nexus API client.
const legacyApi = {
  get: legacyRequest("GET"),
  post: legacyRequest("POST"),
  put: legacyRequest("PUT"),
  patch: legacyRequest("PATCH"),
  delete: legacyRequest("DELETE"),
};

export default legacyApi;