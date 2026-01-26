import { db } from "../db/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Stripe from "stripe";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const FRONTEND_URL = process.env.FRONTEND_URL;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

/* =========================
   AUTH MIDDLEWARE
========================= */
export function requireAuth(req, reply, done) {
  const auth = req.headers.authorization;
  if (!auth) {
    return reply.code(401).send({ error: "Missing Authorization header" });
  }

  const token = auth.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.identity = payload;
    done();
  } catch {
    return reply.code(401).send({ error: "Invalid token" });
  }
}

/* =========================
   ROUTES
========================= */
export async function authRoutes(server) {
  // REGISTER
  server.post("/register", async (req, reply) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return reply.code(400).send({ error: "Email and password required" });
    }

    const exists = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (exists.rowCount) {
      return reply.code(409).send({ error: "Email already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `
      INSERT INTO users (email, password_hash, role, subscription)
      VALUES ($1, $2, 'user', 'free')
      RETURNING id, email, role, subscription
      `,
      [email, hash]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    reply.send({ token, user });
  });

  // LOGIN
  server.post("/login", async (req, reply) => {
    const { email, password } = req.body;

    const result = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (!result.rowCount) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
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
      },
    });
  });

  // SUBSCRIPTION STATUS
  server.get(
    "/subscription",
    { preHandler: requireAuth },
    async (req, reply) => {
      const result = await db.query(
        "SELECT subscription FROM users WHERE id = $1",
        [req.identity.sub]
      );

      if (!result.rowCount) {
        return reply.code(404).send({ error: "User not found" });
      }

      reply.send({
        active: result.rows[0].subscription !== "free",
        tier: result.rows[0].subscription,
      });
    }
  );

  // STRIPE CHECKOUT
  server.post(
    "/stripe/checkout",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { tier } = req.body;

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
    }
  );
}
