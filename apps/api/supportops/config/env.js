import { z } from "zod";
import dotenv from "dotenv";

// Load .env file into process.env if available
dotenv.config();

/**
 * Define the schema for environment variables.
 * Custom transformations and defaults ensure type-safety across the app.
 */
const envSchema = z.object({
    // Server Environment
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    PORT: z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(z.number().positive())
        .default("3000"),

    // Security & Secrets
    JWT_SECRET: z
        .string()
        .min(32, "JWT_SECRET must be at least 32 characters long"),
    COOKIE_SECRET: z
        .string()
        .min(32, "COOKIE_SECRET must be at least 32 characters long"),

    // Database Configurations
    DATABASE_URL: z
        .string()
        .url("DATABASE_URL must be a valid connection string"),
    PG_CA_CERT: z.string().optional(),

    // Payment Processing (Stripe & M-Pesa)
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    MPESA_CONSUMER_KEY: z.string().optional(),
    MPESA_CONSUMER_SECRET: z.string().optional(),
    MPESA_PASSKEY: z.string().optional(),
    MPESA_SHORTCODE: z.string().optional(),

    // Frontend & CORS Defaults
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
});

/**
 * Validate process.env against schema.
 */
const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error(
        "❌ Invalid environment variables:",
        JSON.stringify(_env.error.format(), null, 2)
    );
    process.exit(1);
}

export const env = _env.data;
export default env;