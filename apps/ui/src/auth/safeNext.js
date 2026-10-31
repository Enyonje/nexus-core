/**
 * Safely validates post-login redirect destinations.
 * Prevents external redirects and protocol-relative URLs.
 */
export function safeNext(value, fallback = "/") {
    if (typeof value !== "string" || !value.trim()) {
        return fallback;
    }

    const next = value.trim();

    // Reject external URLs and protocol-relative URLs.
    if (
        !next.startsWith("/") ||
        next.startsWith("//") ||
        next.includes("\\") ||
        /[\r\n]/.test(next)
    ) {
        return fallback;
    }

    try {
        const base = "https://internal.invalid";
        const parsed = new URL(next, base);

        if (parsed.origin !== base || parsed.username || parsed.password) {
            return fallback;
        }

        return parsed.pathname + parsed.search + parsed.hash;
    } catch {
        return fallback;
    }
}
