// supportops/routes/auth.js

export default async function supportOpsAuthRoutes(fastify) {
  // POST /login
  fastify.post("/login", async (request, reply) => {
    const { email, password } = request.body || {};

    if (!email || !password) {
      return reply.code(400).send({
        error: "MISSING_CREDENTIALS",
        message: "Email and password are required",
      });
    }

    // TODO: Replace with your actual DB query (e.g., Prisma / MongoDB)
    const user = {
      id: "usr_123",
      email,
      name: email.split("@")[0] || "Agent User",
      role: "agent",
      plan: "growth",
      status: "active",
      subscribed: true,
      activeOrgId: "org_default_123",
      orgs: [
        {
          id: "org_default_123",
          name: "Default Workspace",
          type: "PERSONAL",
          role: "OWNER",
        },
      ],
    };

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      status: user.status,
      subscribed: user.subscribed,
      activeOrgId: user.activeOrgId,
    });

    const apps = {
      supportops: {
        plan: user.plan,
        status: user.status,
        subscribed: user.subscribed,
      },
    };

    return reply.send({
      success: true,
      token,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      activeOrgId: user.activeOrgId,
      orgs: user.orgs,
      apps,
      user,
    });
  });

  // POST /logout
  fastify.post("/logout", async (request, reply) => {
    return reply.send({ success: true, message: "Logged out successfully" });
  });

  // GET /me
  fastify.get("/me", async (request, reply) => {
    try {
      const decoded = await request.jwtVerify();

      // Structure organization and app state matching AccessProvider expectations
      const activeOrgId = decoded.activeOrgId || "org_default_123";
      const orgs = [
        {
          id: activeOrgId,
          name: "Default Workspace",
          type: "PERSONAL",
          role: decoded.role || "OWNER",
        },
      ];

      const apps = {
        supportops: {
          plan: decoded.plan || "growth",
          status: decoded.status || "active",
          subscribed: decoded.subscribed ?? true,
        },
      };

      const userProfile = {
        id: decoded.id,
        email: decoded.email,
        name: decoded.name || decoded.email?.split("@")[0] || "Agent User",
        role: decoded.role || "agent",
        activeOrgId,
        orgs,
        apps,
      };

      return reply.send({
        success: true,
        ...userProfile,
        user: userProfile, // Included for backward compatibility with components accessing res.data.user
      });
    } catch (err) {
      return reply
        .code(401)
        .send({ error: "UNAUTHORIZED", message: "Invalid or expired token" });
    }
  });
}