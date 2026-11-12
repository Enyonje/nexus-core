import crypto from "node:crypto";
import jwt from "jsonwebtoken";

export function hashToken(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
export function generateRandomToken(bytes = 64) { return crypto.randomBytes(bytes).toString("hex"); }
export function createAccessToken(user, companyName) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be set and at least 32 characters long");
  return jwt.sign({ sub: user.id, email: user.email, role: user.role === "admin" ? "admin" : "user", subscription: user.subscription || "free", org_id: user.org_id, company: companyName || null }, secret, {
    expiresIn: process.env.ACCESS_TOKEN_TTL || "15m",
    issuer: process.env.JWT_ISSUER || "nexus-api",
    audience: process.env.JWT_AUDIENCE || "nexus-client",
  });
}
