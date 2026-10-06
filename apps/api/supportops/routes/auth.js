// supportops/routes/auth.js

export default async function supportOpsAuthRoutes(fastify) {
  // POST /api/v1/supportops/auth/login
  fastify.post("/login", async (request, reply) => {
    const { email, password } = request.body || {};

    if (!email || !password) {
      return reply.code(400).send({ error: "MISSING_CREDENTIALS", message: "Email and password are required" });
    }

    // TODO: Validate user against database
    const user = {
      id: "usr_123",
      email,
      role: "agent",
      plan: "growth",
      status: "active",
      subscribed: true,
    };

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      status: user.status,
      subscribed: user.subscribed,
    });

    return reply.send({
      success: true,
      token,
      user,
    });
  });

  // POST /api/v1/supportops/auth/logout
  fastify.post("/logout", async (request, reply) => {
    return reply.send({ success: true, message: "Logged out successfully" });
  });

  // GET /api/v1/supportops/auth/me
  fastify.get("/me", async (request, reply) => {
    try {
      const decoded = await request.jwtVerify();
      return reply.send({
        success: true,
        user: {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role || "agent",
          plan: decoded.plan || "growth",
          status: decoded.status || "active",
          subscribed: decoded.subscribed ?? true,
        },
      });
    } catch (err) {
      return reply.code(401).send({ error: "UNAUTHORIZED", message: "Invalid or expired token" });
    }
  });
}