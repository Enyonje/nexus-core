import nodemailer from "nodemailer";

let transport;

function getTransport() {
    if (transport) return transport;
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const from = process.env.SMTP_FROM;
    if (!host || !from || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("Email delivery is not configured. Set SMTP_HOST, SMTP_PORT and SMTP_FROM.");
    }
    transport = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === "true" || port === 465,
        ...(process.env.SMTP_USER ? {
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS || "",
            },
        } : {}),
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
    });
    return transport;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
}

export async function sendPasswordResetEmail(email, link, options = {}) {
    let parsedLink;
    try { parsedLink = new URL(link); } catch { parsedLink = null; }
    const secureLink = parsedLink?.protocol === "https:";
    const localDevelopmentLink = process.env.NODE_ENV !== "production"
        && parsedLink?.protocol === "http:"
        && ["localhost", "127.0.0.1"].includes(parsedLink.hostname);
    if (!email || !parsedLink || (!secureLink && !localDevelopmentLink)) {
        throw new Error("A valid HTTPS password setup link is required in production.");
    }
    const setup = options.purpose === "setup";
    const action = setup ? "Set up your password" : "Reset your password";
    const safeLink = escapeHtml(link);
    const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#172033;line-height:1.5"><h2>${action}</h2><p>${setup ? "Your Nexus account has been created. Set a password to keep access to your workspace." : "We received a request to reset your Nexus password."}</p><p><a href="${safeLink}" style="display:inline-block;padding:12px 18px;background:#4338ca;color:#fff;text-decoration:none;border-radius:8px">${action}</a></p><p>This secure link expires in 24 hours. If you did not request this, you can ignore this email.</p><p>Nexus Core</p></body></html>`;
    const text = `${action}\n\n${setup ? "Your Nexus account has been created. Set a password to keep access to your workspace." : "We received a request to reset your Nexus password."}\n\n${link}\n\nThis secure link expires in 24 hours.`;
    return getTransport().sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: `${action} – Nexus Core`,
        text,
        html,
    });
}

export async function verifyEmailTransport() {
    return getTransport().verify();
}
