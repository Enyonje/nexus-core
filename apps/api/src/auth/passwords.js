import bcrypt from "bcryptjs";

export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 128;
const BCRYPT_MAX_BYTES = 72;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AuthError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    Object.assign(this, extra);
  }
}

export function normalizeEmail(email) {
  const value = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!value || value.length > 254 || !EMAIL_RE.test(value)) {
    throw new AuthError(400, "AUTH_INVALID_EMAIL", "Enter a valid email address.");
  }
  return value;
}

export function assertPasswordPolicy(password) {
  if (
    typeof password !== "string" ||
    password.length < MIN_PASSWORD ||
    password.length > MAX_PASSWORD ||
    Buffer.byteLength(password, "utf8") > BCRYPT_MAX_BYTES
  ) {
    throw new AuthError(
      400,
      "AUTH_WEAK_PASSWORD",
      `Password must be ${MIN_PASSWORD}-${MAX_PASSWORD} characters (max ${BCRYPT_MAX_BYTES} bytes).`
    );
  }
}

export const hashPassword = (password) => bcrypt.hash(password, 12);

// Constant-ish time even when the user does not exist, so response timing does not reveal accounts.
let dummyHash;
export async function verifyPassword(password, hash) {
  if (typeof password !== "string") return false;
  if (!hash) {
    dummyHash ??= bcrypt.hash("timing-equaliser-not-a-password", 12);
    await bcrypt.compare(password, await dummyHash);
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
