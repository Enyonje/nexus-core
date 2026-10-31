import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "../config/prisma.js";
import { stripe } from "../config/stripe.js";

import {
    hashToken,
    generateRandomToken,
} from "../lib/crypto.js";

import { auditLog } from "../security/auditLog.js";

// ============================================================
// CONFIGURATION
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET;

const FRONTEND_URL = (
    process.env.FRONTEND_URL ||
    "https://nexusthecore.com"
).replace(/\/$/, "");

const MIN_PASSWORD = 10;
const MAX_PASSWORD = 128;

const REFRESH_TOKEN_DAYS = 30;

// ============================================================
// CONFIGURATION VALIDATION
// ============================================================

function validateConfiguration() {
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured.");
    }
}

// ============================================================
// VALIDATION
// ============================================================

function normalizeEmail(email) {
    if (typeof email !== "string") {
        throw {
            status: 400,
            code: "AUTH_INVALID_EMAIL",
            message: "A valid email address is required.",
        };
    }

    const normalized = email.trim().toLowerCase();

    if (
        normalized.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ) {
        throw {
            status: 400,
            code: "AUTH_INVALID_EMAIL",
            message: "Please provide a valid email address.",
        };
    }

    return normalized;
}

function validateCredentials(email, accessKey) {
    if (
        !email ||
        !accessKey ||
        typeof accessKey !== "string"
    ) {
        throw {
            status: 400,
            code: "AUTH_MISSING_FIELDS",
            message: "Email and password are required.",
        };
    }

    if (
        accessKey.length < MIN_PASSWORD ||
        accessKey.length > MAX_PASSWORD
    ) {
        throw {
            status: 400,
            code: "AUTH_WEAK_PASSWORD",
            message: `Password must be between ${MIN_PASSWORD} and ${MAX_PASSWORD} characters.`,
        };
    }
}

function refreshTokenExpiry() {
    return new Date(
        Date.now() +
        REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000
    );
}

// ============================================================
// ROLE NORMALIZATION
// ============================================================

function normalizeRole(role) {
    return role === "admin" ? "admin" : "user";
}

// ============================================================
// REGISTRATION INTENT
// ============================================================

function resolveRegistrationIntent(intent) {
    if (
        intent === "supportops" ||
        intent === "explore_agents" ||
        intent === "agents" ||
        intent === "launch_swarm" ||
        intent === "dashboard"
    ) {
        return intent;
    }

    return "launch_swarm";
}

function resolveRedirect(intent) {
    switch (intent) {
        case "supportops":
            return "/supportops";

        case "explore_agents":
        case "agents":
            return "/agents";

        case "launch_swarm":
        case "dashboard":
            return "/dashboard";

        default:
            return "/crossborder";
    }
}

// ============================================================
// JWT ACCESS TOKEN
// ============================================================

function createAccessToken(user, companyName) {
    validateConfiguration();

    return jwt.sign(
        {
            sub: user.id,

            email: user.email,

            role: normalizeRole(user.role),

            subscription: user.subscription || "free",

            org_id: user.org_id,

            company: companyName || null,
        },
        JWT_SECRET,
        {
            expiresIn: "15m",
            issuer: "nexus-api",
            audience: "nexus-client",
        }
    );
}

// ============================================================
// ORGANIZATION NAME
// ============================================================

function resolveOrganizationName(organization, company) {
    const name =
        organization ||
        company ||
        "My Organization";

    if (typeof name !== "string") {
        throw {
            status: 400,
            code: "AUTH_INVALID_ORGANIZATION",
            message: "Organization name must be a string.",
        };
    }

    const normalized = name.trim();

    if (
        normalized.length < 2 ||
        normalized.length > 120
    ) {
        throw {
            status: 400,
            code: "AUTH_INVALID_ORGANIZATION",
            message: "Organization name must be between 2 and 120 characters.",
        };
    }

    return normalized;
}

// ============================================================
// REGISTER USER
// ============================================================

export async function registerUser({
    email,
    accessKey,
    organization,
    company,
    intent,
}) {
    validateConfiguration();

    email = normalizeEmail(email);

    validateCredentials(email, accessKey);

    const registrationIntent =
        resolveRegistrationIntent(intent);

    const orgName =
        resolveOrganizationName(
            organization,
            company
        );

    // --------------------------------------------------------
    // PASSWORD HASH
    // --------------------------------------------------------

    const passwordHash =
        await bcrypt.hash(accessKey, 12);

    // --------------------------------------------------------
    // REFRESH TOKEN
    // --------------------------------------------------------

    const rawRefreshToken =
        generateRandomToken(64);

    const hashedRefreshToken =
        hashToken(rawRefreshToken);

    // --------------------------------------------------------
    // TRANSACTION
    // --------------------------------------------------------
    //
    // Recommendation A:
    //
    // Every public registration creates a NEW organization.
    //
    // Existing organizations can only be joined through
    // the invitation workflow.
    //
    // --------------------------------------------------------

    const result = await prisma.$transaction(
        async (tx) => {

            // Check duplicate email inside transaction.

            const existingUser =
                await tx.user.findUnique({
                    where: {
                        email,
                    },
                });

            if (existingUser) {
                throw {
                    status: 409,
                    code: "AUTH_EMAIL_EXISTS",
                    message: "An account with this email already exists.",
                };
            }

            // Create isolated organization.

            const org =
                await tx.organization.create({
                    data: {
                        id: uuidv4(),

                        name: orgName,

                        type: "TEAM",
                    },
                });

            // Create regular user.

            const user =
                await tx.user.create({
                    data: {
                        id: uuidv4(),

                        email,

                        password_hash:
                            passwordHash,

                        role: "user",

                        subscription: "free",

                        org_id: org.id,

                        refresh_token:
                            hashedRefreshToken,

                        refresh_token_expires:
                            refreshTokenExpiry(),

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

            // Create organization owner membership.

            await tx.membership.create({
                data: {
                    org_id: org.id,

                    user_id: user.id,

                    org_role: "owner",
                },
            });

            return {
                org,
                user,
            };
        }
    );

    const { org, user } = result;

    // --------------------------------------------------------
    // ACCESS TOKEN
    // --------------------------------------------------------

    const token =
        createAccessToken(
            user,
            org.name
        );

    // --------------------------------------------------------
    // AUDIT
    // --------------------------------------------------------

    await auditLog(
        user.id,
        "register_success",
        {
            company: org.name,

            intent: registrationIntent,

            role: user.role,

            organization_id: org.id,
        }
    );

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return {
        token,

        rawRefreshToken,

        user: {
            ...user,

            company: org.name,

            intent: registrationIntent,
        },

        redirectTo:
            resolveRedirect(registrationIntent),
    };
}

// ============================================================
// LOGIN USER
// ============================================================

export async function loginUser({
    email,
    accessKey,
    mfaCode,
    intent,
}) {
    validateConfiguration();

    email = normalizeEmail(email);

    if (
        !accessKey ||
        typeof accessKey !== "string"
    ) {
        throw {
            status: 400,
            code: "AUTH_MISSING_FIELDS",
            message: "Email and password are required.",
        };
    }

    // --------------------------------------------------------
    // FIND USER
    // --------------------------------------------------------

    const user =
        await prisma.user.findUnique({
            where: {
                email,
            },

            include: {
                organization: true,
            },
        });

    if (!user || user.deleted_at) {
        throw {
            status: 401,
            code: "AUTH_INVALID_CREDENTIALS",
        };
    }

    // --------------------------------------------------------
    // ACCOUNT LOCKOUT
    // --------------------------------------------------------

    if (
        user.locked_until &&
        user.locked_until > new Date()
    ) {
        throw {
            status: 423,
            code: "AUTH_ACCOUNT_LOCKED",
            message: "Your account is temporarily locked.",
        };
    }

    // --------------------------------------------------------
    // PASSWORD VERIFICATION
    // --------------------------------------------------------

    const validPassword =
        await bcrypt.compare(
            accessKey,
            user.password_hash
        );

    if (!validPassword) {

        const failedAttempts =
            user.failed_attempts + 1;

        const shouldLock =
            failedAttempts >= 5;

        await prisma.user.update({
            where: {
                id: user.id,
            },

            data: {
                failed_attempts:
                    failedAttempts,

                locked_until: shouldLock
                    ? new Date(
                        Date.now() +
                        15 * 60 * 1000
                    )
                    : null,
            },
        });

        throw {
            status: 401,
            code: "AUTH_INVALID_CREDENTIALS",
        };
    }

    // --------------------------------------------------------
    // MFA VERIFICATION
    // --------------------------------------------------------

    if (user.mfa_enabled) {

        if (
            !mfaCode ||
            !user.mfa_secret
        ) {
            throw {
                status: 401,
                code: "AUTH_MFA_REQUIRED",
                message: "A valid MFA code is required.",
            };
        }

        const verified =
            speakeasy.totp.verify({
                secret: user.mfa_secret,

                encoding: "base32",

                token: String(mfaCode),

                window: 1,
            });

        if (!verified) {
            throw {
                status: 401,
                code: "AUTH_INVALID_MFA",
                message: "The MFA code is invalid.",
            };
        }
    }

    // --------------------------------------------------------
    // RESET FAILED ATTEMPTS
    // --------------------------------------------------------

    const role =
        normalizeRole(user.role);

    // --------------------------------------------------------
    // REFRESH TOKEN
    // --------------------------------------------------------

    const rawRefreshToken =
        generateRandomToken(64);

    const hashedRefreshToken =
        hashToken(rawRefreshToken);

    await prisma.user.update({
        where: {
            id: user.id,
        },

        data: {
            refresh_token:
                hashedRefreshToken,

            refresh_token_expires:
                refreshTokenExpiry(),

            failed_attempts: 0,

            locked_until: null,
        },
    });

    // --------------------------------------------------------
    // COMPANY
    // --------------------------------------------------------

    const companyName =
        user.organization?.name || null;

    // --------------------------------------------------------
    // ACCESS TOKEN
    // --------------------------------------------------------

    const normalizedUser = {
        ...user,

        role,
    };

    const token =
        createAccessToken(
            normalizedUser,
            companyName
        );

    // --------------------------------------------------------
    // AUDIT
    // --------------------------------------------------------

    await auditLog(
        user.id,
        "login_success",
        {
            role,

            organization_id: user.org_id,
        }
    );

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    const registrationIntent =
        resolveRegistrationIntent(intent);

    return {
        token,

        rawRefreshToken,

        user: {
            id: user.id,

            email: user.email,

            role,

            subscription: user.subscription,

            org_id: user.org_id,

            company: companyName,

            ai_used: user.ai_used,

            executions_count:
                user.executions_count,

            created_at: user.created_at,

        },

        redirectTo:
            resolveRedirect(registrationIntent),
    };
}

// ============================================================
// REFRESH TOKENS
// ============================================================

export async function refreshTokens(rawRefreshToken) {

    validateConfiguration();

    if (
        !rawRefreshToken ||
        typeof rawRefreshToken !== "string"
    ) {
        throw {
            status: 401,
            code: "AUTH_MISSING_REFRESH",
        };
    }

    const hashedRefreshToken =
        hashToken(rawRefreshToken);

    const now = new Date();

    // --------------------------------------------------------
    // TRANSACTIONAL ROTATION
    // --------------------------------------------------------

    const result = await prisma.$transaction(
        async (tx) => {

            const user =
                await tx.user.findFirst({
                    where: {
                        refresh_token:
                            hashedRefreshToken,

                        refresh_token_expires: {
                            gt: now,
                        },

                        deleted_at: null,
                    },

                    include: {
                        organization: true,
                    },
                });

            if (!user) {
                throw {
                    status: 401,
                    code: "AUTH_INVALID_REFRESH",
                };
            }

            const newRawRefreshToken =
                generateRandomToken(64);

            const newHashedRefreshToken =
                hashToken(newRawRefreshToken);

            // Compare-and-swap rotation:
            // only the request holding the current token
            // can successfully rotate it.

            const updated =
                await tx.user.updateMany({
                    where: {
                        id: user.id,

                        refresh_token:
                            hashedRefreshToken,

                        refresh_token_expires: {
                            gt: now,
                        },
                    },

                    data: {
                        refresh_token:
                            newHashedRefreshToken,

                        refresh_token_expires:
                            refreshTokenExpiry(),
                    },
                });

            if (updated.count !== 1) {
                throw {
                    status: 401,
                    code: "AUTH_INVALID_REFRESH",
                };
            }

            return {
                user,

                newRawRefreshToken,
            };
        }
    );

    // --------------------------------------------------------
    // ACCESS TOKEN
    // --------------------------------------------------------

    const companyName =
        result.user.organization?.name || null;

    const newAccessToken =
        createAccessToken(
            result.user,
            companyName
        );

    // --------------------------------------------------------
    // AUDIT
    // --------------------------------------------------------

    await auditLog(
        result.user.id,
        "refresh_success",
        {}
    );

    return {
        token: newAccessToken,

        rawRefreshToken:
            result.newRawRefreshToken,
    };
}

// ============================================================
// STRIPE CHECKOUT
// ============================================================

export async function createStripeCheckoutSession(
    userId,
    email,
    tier
) {

    if (
        !["pro", "enterprise"].includes(tier)
    ) {
        throw {
            status: 400,
            code: "AUTH_INVALID_TIER",
            message: "Invalid subscription tier.",
        };
    }

    if (!email || !userId) {
        throw {
            status: 400,
            code: "AUTH_MISSING_FIELDS",
        };
    }

    // --------------------------------------------------------
    // VERIFY USER
    // --------------------------------------------------------

    const user =
        await prisma.user.findUnique({
            where: {
                id: userId,
            },

            select: {
                id: true,
                email: true,
                deleted_at: true,
            },
        });

    if (!user || user.deleted_at) {
        throw {
            status: 404,
            code: "AUTH_USER_NOT_FOUND",
        };
    }

    // --------------------------------------------------------
    // STRIPE PRICE
    // --------------------------------------------------------

    const priceId =
        tier === "pro"
            ? process.env.STRIPE_PRO_PRICE_ID
            : process.env.STRIPE_ENTERPRISE_PRICE_ID;

    if (!priceId) {
        throw {
            status: 500,
            code: "AUTH_INVALID_TIER_CONFIG",
            message: "Stripe price configuration is missing.",
        };
    }

    // --------------------------------------------------------
    // CREATE CHECKOUT SESSION
    // --------------------------------------------------------

    const session =
        await stripe.checkout.sessions.create({

            mode: "subscription",

            payment_method_types: [
                "card",
            ],

            line_items: [
                {
                    price: priceId,

                    quantity: 1,
                },
            ],

            customer_email: user.email,

            success_url:
                `${FRONTEND_URL}/subscription?success=1`,

            cancel_url:
                `${FRONTEND_URL}/subscription`,

            metadata: {
                userId: user.id,

                tier,
            },

            subscription_data: {
                metadata: {
                    userId: user.id,

                    tier,
                },
            },
        });

    // --------------------------------------------------------
    // AUDIT
    // --------------------------------------------------------

    await auditLog(
        user.id,
        "stripe_checkout",
        {
            tier,

            session_id: session.id,
        }
    );

    return session.id;
}
