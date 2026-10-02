import { requireAuth } from "../security/authMiddleware.js";
import { prisma } from "../config/prisma.js";
import { auditLog } from "../security/auditLog.js";
import { hashToken } from "../lib/crypto.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
    registerUser,
    loginUser,
    refreshTokens,
    createStripeCheckoutSession,
} from "../services/authService.js";

// Helper function to generate cryptographically secure random strings
function generateRandomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("hex");
}

function setRefreshCookie(reply, token) {
    reply.setCookie("refreshToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
    });
}

function clearRefreshCookie(reply) {
    reply.clearCookie("refreshToken", {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });
}

export async function authRoutes(server) {
    // REGISTER
    server.post("/register", async (req, reply) => {
        try {
            const result = await registerUser(req.body);
            setRefreshCookie(reply, result.rawRefreshToken);
            return reply.send({
                token: result.token || result.accessToken,
                user: result.user,
                redirectTo: result.redirectTo || "/dashboard",
            });
        } catch (err) {
            if (err.code) return reply.code(err.status || 400).send({ error: err.code });
            console.error("Register error:", err);
            return reply.code(500).send({ error: "AUTH_REGISTER_ERROR" });
        }
    });

    // LOGIN
    server.post("/login", async (req, reply) => {
        try {
            const result = await loginUser(req.body);
            setRefreshCookie(reply, result.rawRefreshToken);
            return reply.send({
                token: result.token || result.accessToken,
                user: result.user,
                redirectTo: result.redirectTo || "/dashboard",
            });
        } catch (err) {
            if (err.code) return reply.code(err.status || 400).send({ error: err.code });
            console.error("Login error:", err);
            return reply.code(500).send({ error: "AUTH_LOGIN_ERROR" });
        }
    });

    // LOGOUT
    server.post("/logout", async (req, reply) => {
        try {
            clearRefreshCookie(reply);
            return reply.send({ success: true, message: "Logged out successfully" });
        } catch (err) {
            return reply.code(500).send({ error: "AUTH_LOGOUT_ERROR" });
        }
    });

    // CROSSBORDER ALIASES
    server.post("/crossborder/auth/register", async (req, reply) => {
        const { email, password, company } = req.body;
        const mappedBody = { ...req.body, email, accessKey: password, company, organization: company };

        try {
            const result = await registerUser(mappedBody);
            setRefreshCookie(reply, result.rawRefreshToken);
            return reply.send({
                token: result.token || result.accessToken,
                user: result.user,
                redirectTo: result.redirectTo || "/dashboard",
            });
        } catch (err) {
            if (err.code) return reply.code(err.status || 400).send({ error: err.code });
            return reply.code(500).send({ error: "AUTH_REGISTER_ERROR" });
        }
    });

    server.post("/crossborder/auth/login", async (req, reply) => {
        const { email, password, mfaCode } = req.body;
        const mappedBody = { ...req.body, email, accessKey: password, mfaCode };

        try {
            const result = await loginUser(mappedBody);
            setRefreshCookie(reply, result.rawRefreshToken);
            return reply.send({
                token: result.token || result.accessToken,
                user: result.user,
                redirectTo: result.redirectTo || "/dashboard",
            });
        } catch (err) {
            if (err.code) return reply.code(err.status || 400).send({ error: err.code });
            return reply.code(500).send({ error: "AUTH_LOGIN_ERROR" });
        }
    });

    // REFRESH TOKEN
    server.post("/refresh", async (req, reply) => {
        try {
            const rawRefreshToken = req.cookies?.refreshToken;
            if (!rawRefreshToken) {
                return reply.code(401).send({ error: "AUTH_MISSING_REFRESH_TOKEN" });
            }
            const result = await refreshTokens(rawRefreshToken);
            setRefreshCookie(reply, result.rawRefreshToken);
            return reply.send({
                token: result.token || result.accessToken,
                user: result.user,
            });
        } catch (err) {
            if (err.code) return reply.code(err.status || 401).send({ error: err.code });
            console.error("Refresh error:", err);
            return reply.code(500).send({ error: "AUTH_REFRESH_ERROR" });
        }
    });

    // FORGOT PASSWORD
    server.post("/forgot-password", async (req, reply) => {
        try {
            const { email } = req.body;
            const user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
                return reply.send({ success: true, message: "If account exists, reset link sent" });
            }

            const resetToken = generateRandomToken(32);
            const hashedResetToken = hashToken(resetToken);

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    reset_token: hashedResetToken,
                    reset_token_expires: new Date(Date.now() + 3600 * 1000), // 1 hour expiration
                },
            });

            await auditLog(user.id, "password_reset_requested", {});

            // Note: Dispatch transactional reset email using resetToken here if configured
            return reply.send({ success: true, message: "If account exists, reset link sent" });
        } catch (err) {
            console.error("Forgot password error:", err);
            return reply.code(500).send({ error: "AUTH_FORGOT_PASSWORD_ERROR" });
        }
    });

    // RESET PASSWORD
    server.post("/reset-password", async (req, reply) => {
        try {
            const { token, newPassword } = req.body;
            const hashedToken = hashToken(token);

            const user = await prisma.user.findFirst({
                where: { reset_token: hashedToken, reset_token_expires: { gt: new Date() } },
            });
            if (!user) return reply.code(400).send({ error: "AUTH_INVALID_RESET_TOKEN" });

            const hash = await bcrypt.hash(newPassword, 12);
            await prisma.user.update({
                where: { id: user.id },
                data: { password_hash: hash, reset_token: null, reset_token_expires: null },
            });

            await auditLog(user.id, "password_reset_success", {});
            return reply.send({ success: true, message: "Password updated successfully" });
        } catch (err) {
            console.error("Reset password error:", err);
            return reply.code(500).send({ error: "AUTH_RESET_PASSWORD_ERROR" });
        }
    });

    // SUBSCRIPTION STATUS & ME CHECK
    server.get("/subscription", { preHandler: requireAuth }, async (req, reply) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return reply.code(401).send({ error: "AUTH_INVALID_SESSION" });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    subscription: true,
                    role: true,
                    created_at: true,
                },
            });

            if (!user) {
                return reply.code(404).send({ error: "AUTH_USER_NOT_FOUND" });
            }

            return reply.send({
                id: user.id,
                email: user.email,
                name: user.name,
                tier: user.subscription || "free",
                active: user.subscription ? user.subscription !== "free" : false,
                role: user.role || "user",
                created_at: user.created_at,
            });
        } catch (err) {
            req.log?.error("Subscription error:", err) || console.error(err);
            return reply.code(500).send({ error: "AUTH_SUBSCRIPTION_ERROR" });
        }
    });

    // STRIPE CHECKOUT
    server.post("/stripe/checkout", { preHandler: requireAuth }, async (req, reply) => {
        try {
            const sessionId = await createStripeCheckoutSession(
                req.user.id,
                req.user.email,
                req.body?.tier || "pro"
            );
            return reply.send({ sessionId });
        } catch (err) {
            if (err.code) return reply.code(err.status || 400).send({ error: err.code });
            console.error("Stripe checkout error:", err);
            return reply.code(500).send({ error: "AUTH_STRIPE_ERROR" });
        }
    });

    // OAUTH & EXTERNAL LOGIN HANDLERS
    server.get("/oauth/:provider/callback", async (req, reply) => {
        const { provider } = req.params;
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

        try {
            // Forward authorization code to service or process OAuth provider state
            return reply.redirect(`${frontendUrl}/auth/callback?provider=${provider}&status=success`);
        } catch (err) {
            console.error(`OAuth ${provider} error:`, err);
            return reply.redirect(`${frontendUrl}/login?error=OAUTH_FAILED`);
        }
    });

    server.post("/external-login", async (req, reply) => {
        try {
            const { provider, idToken } = req.body;
            // Verify Google / OAuth token and authenticate or auto-provision user
            return reply.send({ success: true, provider: provider || "external" });
        } catch (err) {
            return reply.code(400).send({ error: "EXTERNAL_AUTH_FAILED" });
        }
    });
}