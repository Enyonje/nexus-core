// src/routes/auth.js
import { db } from "../db/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { requireRole } from "../security/authorize.js";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET not set. Using insecure fallback.");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

function sendResetEmail(email, token) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  return transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Password Reset Request",
    html: `<p>You requested a password reset.</p>
           <p><a href='${resetUrl}'>Click here to reset your password</a></p>
           <p>If you did not request this, ignore this email.</p>`
  });
}

export async function authRoutes(server) {
  // Register
  server.post("/auth/register", async (req, reply) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return reply.code(400).send({ error: "Missing email or password" });
    }
    try {
      const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
      if (existing.rowCount) {
        return reply.code(409).send({ error: "Email already exists" });
      }
      const hash = await bcrypt.hash(password, 10);
      const res = await db.query(
        `INSERT INTO users (email, password_hash, role)
         VALUES ($1, $2, $3)
         RETURNING id, email, role`,
        [email, hash, role || "user"]
      );
      const user = res.rows[0];
      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        JWT_SECRET || "dev_secret",
        { expiresIn: "7d" }
      );
      return { token, user };
    } catch (err) {
      console.error("Register error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // Login
  server.post("/auth/login", async (req, reply) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return reply.code(400).send({ error: "Missing email or password" });
    }
    try {
      const res = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      if (!res.rowCount) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }
      const user = res.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }
      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        JWT_SECRET || "dev_secret",
        { expiresIn: "7d" }
      );
      return { token, user: { id: user.id, email: user.email, role: user.role } };
    } catch (err) {
      console.error("Login error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // ... keep the rest of your routes (forgot-password, reset-password, stripe checkout, webhook, subscription)
  // but wrap DB calls in try/catch and log errors like above
}

// Auth middleware for Fastify
function requireAuth(req, reply, done) {
  const auth = req.headers.authorization;
  if (!auth) {
    return reply.code(401).send({ error: "Missing auth" });
  }
  const token = auth.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET || "dev_secret");
    req.identity = payload;
    done();
  } catch (err) {
    console.error("JWT verification failed:", err);
    reply.code(401).send({ error: "Invalid token" });
  }
}