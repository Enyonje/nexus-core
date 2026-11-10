import process from "node:process";

const base = (process.env.SUPPORTOPS_API_BASE_URL || process.env.API_BASE_URL || "").replace(/\/$/, "");
const token = process.env.SUPPORTOPS_TEST_TOKEN || process.env.API_TOKEN || "";
const orgId = process.env.SUPPORTOPS_TEST_ORG_ID || process.env.ORG_ID || "";

if (!base || !token || !orgId) {
    console.error("Set SUPPORTOPS_API_BASE_URL, SUPPORTOPS_TEST_TOKEN and SUPPORTOPS_TEST_ORG_ID.");
    process.exit(2);
}

const authHeaders = {
    Authorization: `Bearer ${token}`,
    "X-Org-Id": orgId,
    "X-App-Slug": "supportops",
    Accept: "application/json",
};

let failed = 0;
let passed = 0;
let skipped = 0;

async function probe(label, path, { adminOnly = false, requiredChecks = [] } = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
        const response = await fetch(`${base}${path}`, {
            method: "GET",
            headers: authHeaders,
            cache: "no-store",
            signal: controller.signal,
        });
        const body = await response.text();
        if (response.status >= 200 && response.status < 300) {
            if (requiredChecks.length) {
                let checks;
                try { checks = JSON.parse(body); } catch { checks = null; }
                const byKey = new Map(Array.isArray(checks) ? checks.map((item) => [item.key, item]) : []);
                const unhealthy = requiredChecks
                    .map((key) => byKey.get(key))
                    .filter((item) => !item || item.ok !== true);
                if (unhealthy.length) {
                    failed += 1;
                    console.error(`FAIL ${label}: ${unhealthy.map((item) => item ? `${item.key}: ${item.hint || "not ready"}` : "missing required readiness result").join("; ")}`);
                    return;
                }
            }
            passed += 1;
            console.log(`PASS ${label}: HTTP ${response.status}`);
            return;
        }
        if (response.status === 403 && adminOnly) {
            skipped += 1;
            console.log(`SKIP ${label}: HTTP 403 (test account is not an admin/manager)`);
            return;
        }
        failed += 1;
        console.error(`FAIL ${label}: HTTP ${response.status} ${body.slice(0, 240)}`);
    } catch (error) {
        failed += 1;
        console.error(`FAIL ${label}: ${error.message}`);
    } finally {
        clearTimeout(timeout);
    }
}

async function probeTicketStream() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
        const response = await fetch(`${base}/api/v1/supportops/chat/stream`, {
            method: "GET",
            headers: { ...authHeaders, Accept: "text/event-stream" },
            cache: "no-store",
            signal: controller.signal,
        });
        if (!response.ok || !response.headers.get("content-type")?.includes("text/event-stream")) {
            failed += 1;
            console.error(`FAIL ticket SSE: HTTP ${response.status}; expected text/event-stream`);
            return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let ready = false;
        while (!ready) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            ready = buffer.includes('"type":"stream_ready"');
        }
        await reader.cancel().catch(() => {});
        if (ready) {
            passed += 1;
            console.log("PASS ticket SSE: authenticated stream established and ready event received");
        } else {
            failed += 1;
            console.error("FAIL ticket SSE: connection opened but no stream_ready event arrived");
        }
    } catch (error) {
        failed += 1;
        console.error(`FAIL ticket SSE: ${error.message}`);
    } finally {
        clearTimeout(timeout);
        controller.abort();
    }
}

console.log(`SupportOps read-only smoke test: ${base}`);
await probe("system health", "/api/v1/system/health");
await probe("public SupportOps plans", "/api/v1/billing/plans?app=supportops", { adminOnly: false });
await probe("SupportOps module", "/api/v1/supportops/");
await probe("ticket list", "/api/v1/supportops/tickets?status=all&limit=1");
await probe("chat conversations", "/api/v1/supportops/chat/conversations?status=open");
await probe("channel connections", "/api/v1/supportops/tickets/channels");
await probe("organization analytics", "/api/v1/supportops/analytics/org");
await probe("AI review queue", "/api/v1/supportops/ai-review/pending", { adminOnly: true });
await probe("workspace invites", "/api/v1/supportops/invites", { adminOnly: true });
await probe("production readiness", "/api/v1/supportops/readiness", {
    adminOnly: true,
    requiredChecks: ["jwt", "enc", "public_url", "app_url", "stripe", "prices", "realtime_bus"],
});
await probeTicketStream();

console.log(`\nResult: ${passed} passed, ${skipped} role-restricted, ${failed} failed.`);
if (failed) process.exit(1);
