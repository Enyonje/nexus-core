import { requireAuth } from "../security/authMiddleware.js";
import { prisma } from "../config/prisma.js";
import { auditLog } from "../security/auditLog.js";
import { hashToken } from "../lib/crypto.js";
import bcrypt from "bcryptjs";
import {
    registerUser,
    loginUser,
    refreshTokens,
    createStripeCheckoutSession,
} from "../services/authService.js";

function setRefreshCookie(reply, token) {
    reply.setCookie("refreshToken", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
    });
}

export async function authRoutes(server) {
    // REGISTER
    server.post("/register", async (req, reply) => {
        try {
            const result = await registerUser(req.body);
            setRefreshCookie(reply, result.rawRefreshToken);
            return reply.send({
                token: result.token,
                user: result.user,
                redirectTo: result.redirectTo,
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
                token: result.token,
                user: result.user,
                redirectTo: result.redirectTo,
            });
        } catch (err) {
            if (err.code) return reply.code(err.status || 400).send({ error: err.code });
            console.error("Login error:", err);
            return reply.code(500).send({ error: "AUTH_LOGIN_ERROR" });
        }
    });

    // CROSSBORDER ALIASES (Direct function execution instead of server.inject overhead)
    server.post("/crossborder/auth/register", async (req, reply) => {
        const { email, password, company } = req.body;
        req.body = { email, accessKey: password, company, organization: company };

        try {
            const result = await registerUser(req.body);
            setRefreshCookie(reply, result.rawRefreshToken);
            return reply.send({
                token: result.token,
                user: result.user,
                redirectTo: result.redirectTo,
            });
        } catch (err) {
            if (err.code) return reply.code(err.status || 400).send({ error: err.code });
            return reply.code(500).send({ error: "AUTH_REGISTER_ERROR" });
        }
    });

    server.post("/crossborder/auth/login", async (req, reply) => {
        const { email, password, mfaCode } = req.body;
        req.body = { email, accessKey: password, mfaCode };

        try {
            const result = await loginUser(req.body);
            setRefreshCookie(reply, result.rawRefreshToken);
            return reply.send({
                token: result.token,
                user: result.user,
                redirectTo: result.redirectTo,
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
            const result = await refreshTokens(rawRefreshToken);
            setRefreshCookie(reply, result.rawRefreshToken);
            return reply.send({ token: result.token });
        } catch (err) {
            if (err.code) return reply.code(err.status || 400).send({ error: err.code });
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
                    reset_token_expires: new Date(Date.now() + 3600 * 1000),
                },
            });

            await auditLog(user.id, "password_reset_requested", {});
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
            return reply.send({ success: true });
        } catch (err) {
            console.error("Reset password error:", err);
            return reply.code(500).send({ error: "AUTH_RESET_PASSWORD_ERROR" });
        }
    });

    // SUBSCRIPTION STATUS
    server.get("/subscription", { preHandler: requireAuth }, async (req, reply) => {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return reply.code(401).send({ error: "AUTH_INVALID_SESSION" });
            }

            // Query Prisma for subscription info
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    subscription: true,
                    role: true,
                    created_at: true,
                },
            });

            if (!user) {
                return reply.code(404).send({ error: "AUTH_USER_NOT_FOUND" });
            }

            // Optional: audit log for subscription check
            await auditLog(user.id, "subscription_checked", {});

            return reply.send({
                id: user.id,
                email: user.email,
                tier: user.subscription || "free",
                active: user.subscription !== "free",
                role: user.role || "user",
                created_at: user.created_at,
            });
        } catch (err) {
            req.log.error("Subscription error:", err);
            return reply.code(500).send({ error: "AUTH_SUBSCRIPTION_ERROR" });
        }
    });


    // STRIPE CHECKOUT
    server.post("/stripe/checkout", { preHandler: requireAuth }, async (req, reply) => {
        try {
            const sessionId = await createStripeCheckoutSession(
                req.user.id,
                req.user.email,
                req.body?.tier
            );
            return reply.send({ sessionId });
        } catch (err) {
            if (err.code) return reply.code(err.status || 400).send({ error: err.code });
            console.error("Stripe checkout error:", err);
            return reply.code(500).send({ error: "AUTH_STRIPE_ERROR" });
        }
    });

    // OAUTH CALLBACKS
    server.get("/oauth/:provider/callback", async (req, reply) => {
        return reply.send({ success: true, provider: req.params.provider });
    });

    server.post("/external-login", async (req, reply) => {
        return reply.send({ success: true, provider: "external" });
    });
}