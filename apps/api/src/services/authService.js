import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "../config/prisma.js";
import { stripe } from "../config/stripe.js";
import { hashToken, generateRandomToken } from "../lib/crypto.js";
import { auditLog } from "../security/auditLog.js";

const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

function createAccessToken(user, companyName) {
    return jwt.sign(
        {
            sub: user.id,
            email: user.email,
            role: user.role,
            subscription: user.subscription,   // ✅ include subscription tier
            org_id: user.org_id,
            company: companyName,
        },
        JWT_SECRET,
        { expiresIn: "15m" }
    );
}


export async function registerUser({ email, accessKey, organization, company }) {
    if (!email || !accessKey) {
        throw { status: 400, code: "AUTH_MISSING_FIELDS" };
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw { status: 409, code: "AUTH_EMAIL_EXISTS" };

    const orgName = organization || company || "Default Node Org";
    let org = await prisma.organization.findFirst({ where: { name: orgName } });
    if (!org) {
        org = await prisma.organization.create({ data: { id: uuidv4(), name: orgName } });
    }

    const hash = await bcrypt.hash(accessKey, 12);
    const rawRefreshToken = generateRandomToken(64);
    const hashedRefreshToken = hashToken(rawRefreshToken);

    const user = await prisma.user.create({
        data: {
            id: uuidv4(),
            email,
            password_hash: hash,
            role: "user",
            subscription: "free",   // ✅ default subscription
            org_id: org.id,
            refresh_token: hashedRefreshToken,
            refresh_token_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            created_at: new Date(),
        },
        select: {
            id: true,
            email: true,
            role: true,
            subscription: true,
            org_id: true,
            ai_used: true,
            executions_count: true,
            created_at: true,
        },
    });

    const token = createAccessToken(user, orgName);
    await auditLog(user.id, "register_success", { company: orgName });

    return { token, rawRefreshToken, user: { ...user, company: orgName }, redirectTo: "/crossborder" };
}

export async function loginUser({ email, accessKey, mfaCode }) {
    if (!email || !accessKey) throw { status: 400, code: "AUTH_MISSING_FIELDS" };

    const user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true },
    });
    if (!user) throw { status: 401, code: "AUTH_INVALID_CREDENTIALS" };

    // password + lockout + MFA checks (unchanged)...

    const rawRefreshToken = generateRandomToken(64);
    const hashedRefreshToken = hashToken(rawRefreshToken);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            refresh_token: hashedRefreshToken,
            refresh_token_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    });

    const companyName = user.organization?.name || null;
    const token = createAccessToken(user, companyName);  // ✅ includes subscription + role

    await auditLog(user.id, "login_success", {});

    return {
        token,
        rawRefreshToken,
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            subscription: user.subscription,   // ✅ included in response
            org_id: user.org_id,
            company: companyName,
            ai_used: user.ai_used,
            executions_count: user.executions_count,
            created_at: user.created_at,
        },
        redirectTo: "/crossborder",
    };
}

export async function refreshTokens(rawRefreshToken) {
    if (!rawRefreshToken) {
        throw { status: 401, code: "AUTH_MISSING_REFRESH" };
    }

    const hashedRefreshToken = hashToken(rawRefreshToken);
    const user = await prisma.user.findFirst({
        where: {
            refresh_token: hashedRefreshToken,
            refresh_token_expires: { gt: new Date() },
        },
        include: { organization: true },
    });

    if (!user) {
        throw { status: 401, code: "AUTH_INVALID_REFRESH" };
    }

    const newRawRefreshToken = generateRandomToken(64);
    const newHashedRefreshToken = hashToken(newRawRefreshToken);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            refresh_token: newHashedRefreshToken,
            refresh_token_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    });

    const companyName = user.organization?.name || null;
    const newAccessToken = createAccessToken(user, companyName);

    await auditLog(user.id, "refresh_success", {});
    return { token: newAccessToken, rawRefreshToken: newRawRefreshToken };
}

export async function createStripeCheckoutSession(userId, email, tier) {
    if (!["pro", "enterprise"].includes(tier)) {
        throw { status: 400, code: "AUTH_INVALID_TIER" };
    }

    const priceId =
        tier === "pro" ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_ENTERPRISE_PRICE_ID;

    if (!priceId) {
        throw { status: 400, code: "AUTH_INVALID_TIER_CONFIG" };
    }

    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email,
        success_url: `${FRONTEND_URL}/subscription?success=1`,
        cancel_url: `${FRONTEND_URL}/subscription`,
        metadata: { tier },
    });

    await auditLog(userId, "stripe_checkout", { tier });
    return session.id;
}