import bcrypt from "bcryptjs";

export async function authRoutes(fastify, options) {
  /* =========================================================
     AUTH HELPERS / GUARDS
  ========================================================= */

  /**
   * Helper to verify token and retrieve user from PostgreSQL
   */
  const getCurrentUser = async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = request.user.sub;

      const client = await fastify.pg.connect();
      try {
        const res = await client.query(
          "SELECT id, email, name, role FROM users WHERE id = $1",
          [userId]
        );
        const user = res.rows[0];

        if (!user) {
          reply.code(401).send({ error: "User not found" });
          return null;
        }
        return user;
      } finally {
        client.release();
      }
    } catch (err) {
      reply.code(401).send({ error: "Invalid token" });
      return null;
    }
  };

  /**
   * Fastify PreHandler Hook for Admin-only routes
   */
  const requireAdmin = async (request, reply) => {
    const user = await getCurrentUser(request, reply);
    if (!user) return; // Response already sent in getCurrentUser

    if (user.role !== "admin") {
      return reply.code(403).send({ error: "Not enough permissions" });
    }

    request.currentUser = user;
  };

  /* =========================================================
     PUBLIC AUTH ENDPOINTS
  ========================================================= */

  // POST /login
  // Supports form-encoded (OAuth2 Password flow) or JSON body
  fastify.post("/login", async (request, reply) => {
    const username = request.body.username || request.body.email;
    const password = request.body.password;

    if (!username || !password) {
      return reply.code(400).send({ error: "Username/Email and password are required" });
    }

    const client = await fastify.pg.connect();
    try {
      const res = await client.query("SELECT * FROM users WHERE email = $1", [username]);
      const user = res.rows[0];

      if (!user) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.hashed_password || user.password_hash);
      if (!isValid) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }

      const token = fastify.jwt.sign(
        { sub: String(user.id), role: user.role },
        { expiresIn: "1d" }
      );

      return reply.send({
        access_token: token,
        token_type: "bearer",
        role: user.role,
        email: user.email,
        name: user.name || "",
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  // POST /register
  fastify.post("/register", async (request, reply) => {
    const { email, password, name } = request.body;

    if (!email || !password || !name) {
      return reply.code(400).send({ error: "email, password, and name are required" });
    }

    const client = await fastify.pg.connect();
    try {
      const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email]);
      if (existingUser.rows.length > 0) {
        return reply.code(400).send({ error: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const role = "agent"; // default role

      const insertRes = await client.query(
        `INSERT INTO users (email, name, hashed_password, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, role`,
        [email, name, hashedPassword, role]
      );
      const user = insertRes.rows[0];

      const token = fastify.jwt.sign(
        { sub: String(user.id), role: user.role },
        { expiresIn: "1d" }
      );

      return reply.code(201).send({
        access_token: token,
        token_type: "bearer",
        role: user.role,
        email: user.email,
        name: user.name,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Internal server error" });
    } finally {
      client.release();
    }
  });

  /* =========================================================
     PROTECTED ADMIN ROUTES
  ========================================================= */

  fastify.get("/admin/dashboard", { preHandler: requireAdmin }, async (request, reply) => {
    return { message: `Welcome Admin ${request.currentUser.name}` };
  });

  fastify.get("/admin/users", { preHandler: requireAdmin }, async (request, reply) => {
    return { message: "User management page" };
  });

  fastify.get("/admin/settings", { preHandler: requireAdmin }, async (request, reply) => {
    return { message: "App settings page" };
  });
}