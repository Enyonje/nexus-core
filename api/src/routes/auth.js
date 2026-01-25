import { db } from "../db/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { requireRole } from "../security/authorize.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const FRONTEND_URL = process.env.FRONTEND_URL;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

/* ============================
   AUTH MIDDLEWARE
============================ */
function requireAuth(req, reply, done) {
  const auth = req.headers.authorization;
  if (!auth) {
    return reply.code(401).send({ error: "Missing authorization header" });
  }

  const token = auth.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.identity = payload;
    done();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return reply.code(401).send({ error: "Invalid token" });
  }
}

/* ============================
   ROUTES
============================ */
export async function authRoutes(server) {
  /**
   * REGISTER
   * POST /auth/register
   */
  server.post("/auth/register", async (req, reply) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return reply.code(400).send({ error: "Email and password required" });
    }

    try {
      const existing = await db.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existing.rowCount) {
        return reply.code(409).send({ error: "Email already exists" });
      }

      const hash = await bcrypt.hash(password, 10);

      const result = await db.query(
        `
        INSERT INTO users (email, password_hash, role, subscription)
        VALUES ($1, $2, $3, 'free')
        RETURNING id, email, role, subscription
        `,
        [email, hash, role || "user"]
      );

      const user = result.rows[0];

      const token = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return reply.send({ token, user });
    } catch (err) {
      console.error("Register error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  /**
   * LOGIN
   * POST /auth/login
   */
  server.post("/auth/login", async (req, reply) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return reply.code(400).send({ error: "Email and password required" });
    }

    try {
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

      return reply.send({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          subscription: user.subscription,
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  /**
   * SUBSCRIPTION STATUS
   * GET /auth/subscription
   */
  server.get(
    "/auth/subscription",
    { preHandler: requireAuth },
    async (req, reply) => {
      try {
        const result = await db.query(
          "SELECT subscription FROM users WHERE id = $1",
          [req.identity.sub]
        );

        if (!result.rowCount) {
          return reply.code(404).send({ error: "User not found" });
        }

        return reply.send({
          active: result.rows[0].subscription !== "free",
          tier: result.rows[0].subscription,
        });
      } catch (err) {
        console.error("Subscription fetch error:", err);
        return reply.code(500).send({ error: "Internal server error" });
      }
    }
  );

  /**
   * STRIPE CHECKOUT
   * POST /auth/stripe/checkout
   */
  server.post(
    "/auth/stripe/checkout",
    { preHandler: requireAuth },
    async (req, reply) => {
      const { tier } = req.body;

      if (!tier) {
        return reply.code(400).send({ error: "Missing subscription tier" });
      }

      try {
        const priceId =
          tier === "pro"
            ? process.env.STRIPE_PRO_PRICE_ID
            : process.env.STRIPE_ENTERPRISE_PRICE_ID;

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [{ price: priceId, quantity: 1 }],
          customer_email: req.identity.email,
          success_url: `${FRONTEND_URL}/subscription-success`,
          cancel_url: `${FRONTEND_URL}/subscription-cancel`,
          metadata: { tier },
        });

        return reply.send({ sessionId: session.id });
      } catch (err) {
        console.error("Stripe checkout error:", err);
        return reply
          .code(500)
          .send({ error: "Failed to create checkout session" });
      }
    }
  );

  /**
   * STRIPE WEBHOOK
   * POST /auth/stripe/webhook
   */
  server.post("/auth/stripe/webhook", async (req, reply) => {
    const sig = req.headers["stripe-signature"];

    try {
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const tier = session.metadata?.tier || "pro";

        await db.query(
          "UPDATE users SET subscription = $1 WHERE email = $2",
          [tier, session.customer_email]
        );
      }

      reply.send({ received: true });
    } catch (err) {
      console.error("Stripe webhook error:", err);
      reply.code(400).send({ error: "Webhook error" });
    }
  });
}
