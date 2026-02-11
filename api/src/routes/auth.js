import { db } from "../db/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const FRONTEND_URL = process.env.FRONTEND_URL;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

/* =========================
   AUTH MIDDLEWARE
========================= */
export function requireAuth(req, reply, done) {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return reply.code(401).send({ error: "Missing Authorization header" });
    }

    const token = auth.replace("Bearer ", "");
    const payload = jwt.verify(token, JWT_SECRET);

    req.identity = payload;
    done();
  } catch (err) {
    return reply.code(401).send({ error: "Invalid token" });
  }
}

/* =========================
   ROUTES
========================= */
export async function authRoutes(server) {
  /* ---------- REGISTER ---------- */
  server.post("/register", async (req, reply) => {
    try {
      const { email, password, orgName } = req.body;

      if (!email || !password || !orgName) {
        return reply.code(400).send({ error: "Email, password, and orgName required" });
      }

      const exists = await db.query("SELECT id FROM users WHERE email = $1", [email]);
      if (exists.rowCount) {
        return reply.code(409).send({ error: "Email already exists" });
      }

      const hash = await bcrypt.hash(password, 10);

      // Generate UUIDs
      const userId = uuidv4();
      const orgId = uuidv4();

      // Insert organization
      await db.query(
        `INSERT INTO organizations (id, name, created_at)
         VALUES ($1, $2, NOW())`,
        [orgId, orgName]
      );

      // Insert user linked to org
      const result = await db.query(
        `INSERT INTO users (id, email, password_hash, role, subscription, org_id, created_at)
         VALUES ($1, $2, $3, 'user', 'free', $4, NOW())
         RETURNING id, email, role, subscription, org_id`,
        [userId, email, hash, orgId]
      );

      const user = result.rows[0];

      // Generate JWT with org_id included
      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role, org_id: user.org_id },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      reply.send({ token, user });
    } catch (err) {
      console.error("Register error:", err);
      reply.code(500).send({ error: "Internal server error" });
    }
  });

  /* ---------- LOGIN ---------- */
  server.post("/login", async (req, reply) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return reply.code(400).send({ error: "Email and password required" });
      }

      const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
      if (!result.rowCount) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role, org_id: user.org_id },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subscription: user.subscription,
          org_id: user.org_id,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      reply.code(500).send({ error: "Internal server error" });
    }
  });

  /* ---------- SUBSCRIPTION STATUS ---------- */
  server.get("/subscription", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const userId = req.identity?.sub;
      if (!userId) {
        return reply.code(401).send({ error: "Invalid session" });
      }

      const result = await db.query("SELECT subscription FROM users WHERE id = $1", [userId]);
      if (!result.rowCount) {
        return reply.code(404).send({ error: "User not found" });
      }

      reply.send({
        tier: result.rows[0].subscription,
        active: result.rows[0].subscription !== "free",
      });
    } catch (err) {
      console.error("Subscription fetch failed:", err);
      reply.code(500).send({ error: "Internal Server Error" });
    }
  });

  /* ---------- STRIPE CHECKOUT ---------- */
  server.post("/stripe/checkout", { preHandler: requireAuth }, async (req, reply) => {
    try {
      const { tier } = req.body;
      if (!tier) {
        return reply.code(400).send({ error: "Missing tier" });
      }

      const priceId =
        tier === "pro"
          ? process.env.STRIPE_PRO_PRICE_ID
          : process.env.STRIPE_ENTERPRISE_PRICE_ID;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: req.identity.email,
        success_url: `${FRONTEND_URL}/subscription?success=1`,
        cancel_url: `${FRONTEND_URL}/subscription`,
        metadata: { tier },
      });

      reply.send({ sessionId: session.id });
    } catch (err) {
      console.error("Stripe checkout error:", err);
      reply.code(500).send({ error: "Stripe checkout failed" });
    }
  });
}