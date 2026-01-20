// src/routes/auth.js
import { db } from "../db/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import crypto from "crypto";
import nodemailer from "nodemailer";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
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
    html: `<p>You requested a password reset.</p><p><a href='${resetUrl}'>Click here to reset your password</a></p><p>If you did not request this, ignore this email.</p>`
  });
}

export async function authRoutes(server) {
  // Register
  server.post("/auth/register", async (req, reply) => {
    const { email, password, role } = req.body;
    if (!email || !password) return reply.code(400).send({ error: "Missing email or password" });
    const hash = await bcrypt.hash(password, 10);
    try {
      const res = await db.query(
        `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role`,
        [email, hash, role || "user"]
      );
      const user = res.rows[0];
      const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
      return { token, user };
    } catch (err) {
      return reply.code(400).send({ error: "Email already exists" });
    }
  });

  // Login
  server.post("/auth/login", async (req, reply) => {
    const { email, password } = req.body;
    if (!email || !password) return reply.code(400).send({ error: "Missing email or password" });
    const res = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
    if (!res.rowCount) return reply.code(401).send({ error: "Invalid credentials" });
    const user = res.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return reply.code(401).send({ error: "Invalid credentials" });
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    return { token, user: { id: user.id, email: user.email, role: user.role } };
  });

  // Get current user
  server.get("/auth/me", { preHandler: [requireAuth] }, async (req) => {
    return { user: req.identity };
  });

  // Forgot password: send reset token (public)
  server.post("/auth/forgot-password", async (req, reply) => {
    const { email } = req.body;
    if (!email) return reply.code(400).send({ error: "Missing email" });
    const res = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (!res.rowCount) return reply.code(404).send({ error: "User not found" });
    const userId = res.rows[0].id;
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min
    await db.query(
      `INSERT INTO password_resets (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3`,
      [userId, token, expires]
    );
    await sendResetEmail(email, token);
    return { message: "Reset link sent" };
  });

  // Reset password (public)
  server.post("/auth/reset-password", async (req, reply) => {
    const { token, password } = req.body;
    if (!token || !password) return reply.code(400).send({ error: "Missing token or password" });
    const res = await db.query(
      `SELECT user_id FROM password_resets WHERE token = $1 AND expires_at > NOW()`, 
      [token]
    );
    if (!res.rowCount) return reply.code(400).send({ error: "Invalid or expired token" });
    const userId = res.rows[0].user_id;
    const hash = await bcrypt.hash(password, 10);
    await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, userId]);
    await db.query("DELETE FROM password_resets WHERE user_id = $1", [userId]);
    return { message: "Password reset successful" };
  });

  // Create Stripe Checkout Session
  server.post("/auth/stripe/checkout", { preHandler: [requireAuth] }, async (req, reply) => {
    const { priceId } = req.body;
    if (!priceId) return reply.code(400).send({ error: "Missing priceId" });
    const userId = req.identity.sub;
    // Create Stripe customer if not exists
    let customerId;
    const res = await db.query("SELECT stripe_customer_id FROM stripe_customers WHERE user_id = $1", [userId]);
    if (res.rowCount) {
      customerId = res.rows[0].stripe_customer_id;
    } else {
      const userRes = await db.query("SELECT email FROM users WHERE id = $1", [userId]);
      const email = userRes.rows[0]?.email;
      const customer = await stripe.customers.create({ email });
      await db.query("INSERT INTO stripe_customers (user_id, stripe_customer_id) VALUES ($1, $2)", [userId, customer.id]);
      customerId = customer.id;
    }
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: process.env.FRONTEND_URL + "/settings?success=1",
      cancel_url: process.env.FRONTEND_URL + "/settings?canceled=1",
    });
    return { url: session.url };
  });

  // Stripe webhook endpoint
  server.post("/auth/stripe/webhook", async (req, reply) => {
    const sig = req.headers["stripe-signature"];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return reply.code(400).send({ error: `Webhook Error: ${err.message}` });
    }
    // Handle subscription events
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const sub = event.data.object;
      const customerId = sub.customer;
      const userRes = await db.query("SELECT user_id FROM stripe_customers WHERE stripe_customer_id = $1", [customerId]);
      if (userRes.rowCount) {
        const userId = userRes.rows[0].user_id;
        await db.query(
          `INSERT INTO stripe_subscriptions (user_id, stripe_subscription_id, status, current_period_end)
           VALUES ($1, $2, $3, to_timestamp($4))
           ON CONFLICT (user_id) DO UPDATE SET status = $3, current_period_end = to_timestamp($4)`,
          [userId, sub.id, sub.status, sub.current_period_end]
        );
      }
    }
    reply.send({ received: true });
  });

  // Get user subscription status
  server.get("/auth/subscription", { preHandler: [requireAuth, requireRole("user", "admin", "premium")] }, async (req) => {
    const userId = req.identity.sub;
    const res = await db.query(
      `SELECT s.name, s.price_cents, ss.status, ss.current_period_end
       FROM users u
       LEFT JOIN subscriptions s ON u.subscription_id = s.id
       LEFT JOIN stripe_subscriptions ss ON u.id = ss.user_id
       WHERE u.id = $1`,
      [userId]
    );
    return res.rows[0] || {};
  });
}

// Auth middleware for Fastify
function requireAuth(req, reply, done) {
  const auth = req.headers.authorization;
  if (!auth) return reply.code(401).send({ error: "Missing auth" });
  const token = auth.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.identity = payload;
    done();
  } catch {
    reply.code(401).send({ error: "Invalid token" });
  }
}
