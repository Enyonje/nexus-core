import { db } from "../db/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { requireRole } from "../security/authorize.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2022-11-15" });

// Auth middleware for Fastify
function requireAuth(req, reply, done) {
  const auth = req.headers.authorization;
  if (!auth) {
    return reply.code(401).send({ error: "Missing auth" });
  }
  const token = auth.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.identity = payload;
    done();
  } catch (err) {
    console.error("JWT verification failed:", err);
    reply.code(401).send({ error: "Invalid token" });
  }
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
        `INSERT INTO users (email, password_hash, role, subscription)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role, subscription`,
        [email, hash, role || "user", "free"]
      );
      const user = res.rows[0];
      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        JWT_SECRET,
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
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      return { token, user: { id: user.id, email: user.email, role: user.role, subscription: user.subscription } };
    } catch (err) {
      console.error("Login error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // Subscription status
  server.get("/auth/subscription", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const res = await db.query("SELECT subscription FROM users WHERE id = $1", [req.identity.sub]);
      if (!res.rowCount) {
        return reply.code(404).send({ error: "User not found" });
      }
      return { subscription: res.rows[0].subscription || "free" };
    } catch (err) {
      console.error("Subscription fetch error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  // Stripe checkout
  server.post("/auth/stripe/checkout", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { tier } = req.body; // "pro" or "enterprise"
      if (!tier) {
        return reply.code(400).send({ error: "Missing subscription tier" });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
          {
            price: tier === "pro" ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_ENTERPRISE_PRICE_ID,
            quantity: 1,
          },
        ],
        success_url: `${process.env.FRONTEND_URL}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/subscription-cancel`,
        customer_email: req.identity.email,
      });

      return { sessionId: session.id };
    } catch (err) {
      console.error("Stripe checkout error:", err);
      return reply.code(500).send({ error: "Failed to create checkout session" });
    }
  });

  // Stripe webhook (to update subscription in DB)
  server.post("/auth/stripe/webhook", async (req, reply) => {
    const sig = req.headers["stripe-signature"];
    try {
      const event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const email = session.customer_email;
        const tier = session.metadata?.tier || "pro"; // fallback

        await db.query("UPDATE users SET subscription = $1 WHERE email = $2", [tier, email]);
      }

      reply.send({ received: true });
    } catch (err) {
      console.error("Stripe webhook error:", err);
      reply.code(400).send({ error: "Webhook error" });
    }
  });
}