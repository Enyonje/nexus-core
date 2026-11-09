import { apiFetch as sharedApiFetch } from "../../../lib/api";

export const apiFetch = (url, options = {}) => sharedApiFetch(url, options);

const legacyRequest = (method) => async (url, bodyOrConfig, maybeConfig = {}) => {
  const isRead = method === "GET" || method === "DELETE";
  const options = isRead
    ? { ...(bodyOrConfig || {}), method }
    : { ...(maybeConfig || {}), method, body: bodyOrConfig };
  const data = await sharedApiFetch(url, options);
  return { data };
};

// Compatibility for older SupportOps screens that consume axios-style responses.
// Authentication, refresh, tenant selection, timeout and error normalization are
// handled by the single shared Nexus API client.
const api = {
  get: legacyRequest("GET"),
  post: legacyRequest("POST"),
  put: legacyRequest("PUT"),
  patch: legacyRequest("PATCH"),
  delete: legacyRequest("DELETE"),
};

export default api;
