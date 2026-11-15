// SupportOps is mounted inside Nexus Core. Keep API requests same-origin by
// default so local Vite proxying and the production /api rewrite both work.
// Only override this for an explicitly configured API host.
const configuredBase =
  import.meta.env.VITE_SUPPORTOPS_API_URL || import.meta.env.VITE_API_URL || "";
const API_BASE_URL = configuredBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
const api = (path) => `${API_BASE_URL}${path}`;

export const endpoints = {
  tickets: api("/api/v1/supportops/tickets"),
  webhook: api("/api/v1/supportops/tickets/channels/webhook"),
  audit: api("/api/v1/audit/logs"),
};
