import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: z.coerce.number().default(3001),

    // Database
    DATABASE_URL: z.string().url({ message: "DATABASE_URL must be a valid connection string" }),
    PG_CA_CERT: z.string().optional(),

    // Auth & Cryptography
    JWT_SECRET: z.string().min(32, { message: "JWT_SECRET must be at least 32 characters long" }),
    COOKIE_SECRET: z.string().min(16, { message: "COOKIE_SECRET must be at least 16 characters long" }),

    // External Services
    STRIPE_SECRET_KEY: z.string().min(1, { message: "STRIPE_SECRET_KEY is required" }),
    STRIPE_PRO_PRICE_ID: z.string().optional(),
    STRIPE_ENTERPRISE_PRICE_ID: z.string().optional(),

    // Frontend & Keep-Alive
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    PING_SECRET_KEY: z
        .string()
        .min(16, { message: "PING_SECRET_KEY must be at least 16 characters for secure cron endpoints" }),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error("❌ Invalid environment variables:");
    console.error(JSON.stringify(_env.error.format(), null, 2));
    process.exit(1); // Fail immediately on startup
}

export const env = _env.data;