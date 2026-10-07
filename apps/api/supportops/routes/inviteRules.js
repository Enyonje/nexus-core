// supportops/routes/inviteRules.js  Pure invite rules (no database), unit tested.
import crypto from "node:crypto";

// Admins are created by owning the workspace (trial or checkout), never by invite or signup form
export const INVITABLE_ROLES = ["agent", "management", "investor"];
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const normEmail = (e) => String(e ?? "").trim().toLowerCase();
export const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail(e)) && normEmail(e).length <= 254;
export const roleAllowed = (role) => INVITABLE_ROLES.includes(role);

export const newToken = () => crypto.randomBytes(32).toString("base64url");
export const hashToken = (t) => crypto.createHash("sha256").update(String(t)).digest("hex"); // only the hash is stored
export const inviteExpiry = (now = new Date()) => new Date(now.getTime() + INVITE_TTL_MS);

// null = the invite can be used. `userEmail` is the signed-in person's email (omit for the public preview).
export function inviteProblem(invite, userEmail, now = new Date()) {
    if (!invite) return { status: 404, code: "INVITE_NOT_FOUND", message: "This invitation link is not valid." };
    if (invite.status !== "pending") return { status: 410, code: "INVITE_USED", message: "This invitation has already been used or was cancelled." };
    if (new Date(invite.expires_at) <= now) return { status: 410, code: "INVITE_EXPIRED", message: "This invitation has expired. Ask your admin for a new one." };
    if (userEmail !== undefined && normEmail(invite.email) !== normEmail(userEmail)) {
        return { status: 403, code: "EMAIL_MISMATCH", message: `This invitation was sent to ${invite.email}. Log in with that email address.` };
    }
    return null;
}