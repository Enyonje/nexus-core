import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getProduct } from "./products.js";

export const ISSUER = "nexusthecore.com/auth";
export const ACCESS_TTL_SECONDS = 15 * 60;
export const REFRESH_TTL_DAYS = 30;

const keyCache = new Map();

/**
 * Signing key for one product. An explicit <PREFIX>_JWT_SECRET wins; otherwise the key is derived
 * from the shared JWT_SECRET with HKDF, using the product slug as context, so the keys differ per
 * product even when only one secret is configured.
 */
export function signingKey(slug, env = process.env) {
  const product = getProduct(slug);
  const explicit = env[`${product.envPrefix}_JWT_SECRET`];
  const master = env.JWT_SECRET;
  const cacheKey = `${slug}:${explicit ? "x" : "d"}:${explicit || master}`;
  if (keyCache.has(cacheKey)) return keyCache.get(cacheKey);

  let key;
  if (explicit) {
    if (explicit.length < 32) throw new Error(`${product.envPrefix}_JWT_SECRET must be at least 32 characters`);
    key = Buffer.from(explicit, "utf8");
  } else {
    if (!master || master.length < 32) throw new Error("JWT_SECRET must be set (at least 32 characters)");
    key = Buffer.from(crypto.hkdfSync("sha256", master, "nexus-core-auth-v1", `product:${slug}`, 32));
  }
  keyCache.set(cacheKey, key);
  return key;
}

export function signAccessToken(slug, claims, env = process.env) {
  const { sub, ...rest } = claims;
  return jwt.sign({ ...rest, product: slug }, signingKey(slug, env), {
    algorithm: "HS256",
    subject: String(sub),
    audience: slug,
    issuer: ISSUER,
    expiresIn: ACCESS_TTL_SECONDS,
  });
}

/** Throws unless the token was issued for exactly this product. */
export function verifyAccessToken(slug, token, env = process.env) {
  const payload = jwt.verify(token, signingKey(slug, env), {
    algorithms: ["HS256"],
    audience: slug,
    issuer: ISSUER,
  });
  if (payload.product !== slug) throw new Error("Token product mismatch");
  return payload;
}

export function newRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function refreshExpiry(now = Date.now()) {
  return new Date(now + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
}
