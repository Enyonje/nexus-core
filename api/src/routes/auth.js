import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Stripe from "stripe";
import { v4 as uuidv4 } from "uuid";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

/* =========================
   AUTH MIDDLEWARE
========================= */
export function requireAuth(req, reply, done) {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token && req.cookies?.authToken) {
      token = req.cookies.authToken;
    }
    if (!token && req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      return reply.code(401).send({ error: "Unauthorized: missing token" });
    }

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
    const { email, accessKey, organization } = req.body;
    if (!email || !accessKey || !organization) {
      return reply.code(400).send({ error: "Email, access key, and organization required" });
    }

    // Check if user already exists
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return reply.code(409).send({ error: "Email already exists" });
    }

    // Hash the access key
    const hash = await bcrypt.hash(accessKey, 10);

    // Create organization
    const org = await prisma.organization.create({
      data: { id: uuidv4(), name: organization },
    });

    // Create user
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email,
        password_hash: hash,   // still stored in password_hash column
        role: "user",
        subscription: "free",
        org_id: org.id,
      },
      select: { id: true, email: true, role: true, subscription: true, org_id: true },
    });

    // Generate JWT
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
    const { email, accessKey } = req.body;
    if (!email || !accessKey) {
      return reply.code(400).send({ error: "Email and access key required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(accessKey, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    // Ensure org exists
    if (!user.org_id) {
      const org = await prisma.organization.create({
        data: { id: uuidv4(), name: "Default Org" },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { org_id: org.id },
      });
      user.org_id = org.id;
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

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscription: true },
      });
      if (!user) {
        return reply.code(404).send({ error: "User not found" });
      }

      reply.send({
        tier: user.subscription,
        active: user.subscription !== "free",
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