// supportops/routes/auth.js
// SupportOps authentication routes (relative paths only)

export default async function supportOpsAuthRoutes(fastify) {
  // POST /api/v1/supportops/auth/login
  fastify.post("/login", async (request, reply) => {
    const { email, password } = request.body;

    // Example authentication logic (replace with your real implementation)
    if (!email || !password) {
      return reply.code(400).send({ error: "MISSING_CREDENTIALS" });
    }

    // TODO: validate user against database
    const user = { id: "123", email, role: "agent" };

    // Issue JWT
    const token = fastify.jwt.sign({ id: user.id, role: user.role });

    return reply.send({
      success: true,
      token,
      user,
    });
  });

  // POST /api/v1/supportops/auth/logout
  fastify.post("/logout", async (request, reply) => {
    // Invalidate token logic (if using a blacklist or session store)
    return reply.send({ success: true, message: "Logged out successfully" });
  });

  // GET /api/v1/supportops/auth/me
  fastify.get("/me", async (request, reply) => {
    try {
      const decoded = await request.jwtVerify();
      return reply.send({ success: true, user: decoded });
    } catch (err) {
      return reply.code(401).send({ error: "UNAUTHORIZED" });
    }
  });
}
