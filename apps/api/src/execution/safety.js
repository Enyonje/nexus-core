// src/execution/safety.js
// Outbound-request guards shared by the runner and agent tools.
import dns from "node:dns/promises";
import net from "node:net";

export const STEP_TIMEOUT_MS = 30_000;

const refuse = (msg) => Object.assign(new Error(msg), { retryable: false });

export const withTimeout = (signal) =>
    signal && AbortSignal.any ? AbortSignal.any([signal, AbortSignal.timeout(STEP_TIMEOUT_MS)]) : AbortSignal.timeout(STEP_TIMEOUT_MS);

export function isPrivateIp(ip) {
    if (net.isIPv4(ip)) {
        const [a, b] = ip.split(".").map(Number);
        return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
    }
    if (net.isIPv6(ip)) {
        const l = ip.toLowerCase();
        if (l.startsWith("::ffff:")) return isPrivateIp(l.slice(7));
        return l === "::1" || l === "::" || /^(fc|fd|fe[89ab])/.test(l);
    }
    return true; // unknown format: refuse
}

// Cheap string checks (sync)
export function assertSafeUrl(raw) {
    let u;
    try { u = new URL(raw); } catch { throw refuse("Invalid URL"); }
    if (!["http:", "https:"].includes(u.protocol)) throw refuse("Only http(s) URLs are allowed");
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".internal") || h.endsWith(".local")) throw refuse("URL points to a private address");
    return u.toString();
}

// Full check: also resolves DNS and rejects any private address.
// Residual risk: DNS rebinding between this check and the fetch. Use an egress proxy to close it fully.
export async function assertPublicUrl(raw) {
    const href = assertSafeUrl(raw);
    const host = new URL(href).hostname.replace(/^\[|\]$/g, "");
    const addrs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw refuse("URL points to a private address");
    return href;
}