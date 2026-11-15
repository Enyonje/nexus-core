/**
 * Server-to-server event bridge for independently deployed Nexus products.
 *
 * Configure NEXUS_CORE_API_URL with the Nexus Core API origin and
 * NEXUS_INTEGRATION_TOKENS_JSON with a JSON object whose keys are
 * "<product>:<local-workspace-id>" and values are Nexus integration tokens.
 * Example: {"supportops:tenant_123":"nx_int_...","socialops:ws_456":"nx_int_..."}
 *
 * This module is deliberately best-effort: product workflows must continue if
 * Nexus Core is temporarily unavailable. Never pass customer message contents,
 * email addresses, names, or other personal data in event metadata.
 */

const DEFAULT_TIMEOUT_MS = 3500;

function readTokenMap() {
  const raw = process.env.NEXUS_INTEGRATION_TOKENS_JSON;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    console.error("[NexusEvents] NEXUS_INTEGRATION_TOKENS_JSON is not valid JSON.");
    return {};
  }
}

function safeLog(logger, level, message, details = {}) {
  const fn = logger?.[level] || console[level] || console.log;
  try { fn.call(logger || console, details, message); } catch { /* logging must never affect product workflows */ }
}

export function createNexusBusinessEventClient({ product, department, logger } = {}) {
  const sourceProduct = String(product || "external").toLowerCase();
  const defaultDepartment = ["grow", "sell", "serve", "operate"].includes(department)
    ? department
    : "operate";

  return async function emitNexusBusinessEvent(localWorkspaceId, event) {
    const workspaceId = localWorkspaceId == null ? "" : String(localWorkspaceId);
    const baseUrl = (process.env.NEXUS_CORE_API_URL || "").replace(/\/+$/, "");
    if (!baseUrl || !workspaceId || typeof fetch !== "function") return { sent: false, reason: "not_configured" };

    const tokenMap = readTokenMap();
    const token = tokenMap[`${sourceProduct}:${workspaceId}`] || tokenMap[workspaceId];
    if (!token || !String(token).startsWith("nx_int_")) return { sent: false, reason: "workspace_not_connected" };

    const payload = {
      type: String(event?.type || `${sourceProduct}.activity`).slice(0, 80),
      title: String(event?.title || `${sourceProduct} activity`).slice(0, 160),
      description: String(event?.description || "").slice(0, 1000),
      department: event?.department || defaultDepartment,
      metadata: event?.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
        ? event.metadata
        : {},
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetch(`${baseUrl}/api/integrations/events`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-nexus-source": sourceProduct,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok) {
        safeLog(logger, "warn", "Nexus business event was rejected.", { product: sourceProduct, status: response.status });
        return { sent: false, reason: "rejected", status: response.status };
      }
      return { sent: true };
    } catch (error) {
      safeLog(logger, "warn", "Nexus Core event delivery failed; product workflow continues.", {
        product: sourceProduct,
        error: error?.name === "AbortError" ? "timeout" : error?.message || "network_error",
      });
      return { sent: false, reason: error?.name === "AbortError" ? "timeout" : "network_error" };
    } finally {
      clearTimeout(timeout);
    }
  };
}
