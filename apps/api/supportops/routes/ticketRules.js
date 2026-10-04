// backend/routes/ticketRules.js
// Pure ticket rules (no database) so they can be unit tested.

// First-response targets in minutes. Later, load these per plan or per organization.
export const SLA_MINUTES = { urgent: 15, high: 60, normal: 240, low: 1440 };
export const REOPEN_WINDOW_MS = 72 * 60 * 60 * 1000; // a customer replying within 72h of "solved" reopens the ticket

export const slaDueAt = (priority, from = new Date()) =>
    new Date(from.getTime() + (SLA_MINUTES[priority] ?? SLA_MINUTES.normal) * 60000);

// Simple keyword rules. A starting point, not a classifier: tune them with real tickets.
export function priorityFor({ channel, text = "" }) {
    if (/\b(fraud|unauthori[sz]ed|hacked|emergency|chargeback)\b/i.test(text)) return "urgent";
    if (
        channel === "voice" ||
        /\b(urgent|asap|immediately|not working|failed|charged twice)\b/i.test(text)
    )
        return "high";
    return "normal";
}

// Should a new message join this customer's latest ticket (true) or start a new one (false)?
export function canAppend(ticket, now = new Date()) {
    if (!ticket) return false;
    if (ticket.status === "open" || ticket.status === "pending") return true;
    if (ticket.status === "solved" && ticket.resolved_at)
        return now - new Date(ticket.resolved_at) <= REOPEN_WINDOW_MS;
    return false; // closed tickets stay closed
}

/* ---------- default export ---------- */
export default {
    SLA_MINUTES,
    REOPEN_WINDOW_MS,
    slaDueAt,
    priorityFor,
    canAppend,
};
