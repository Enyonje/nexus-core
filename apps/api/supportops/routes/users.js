import bcrypt from "bcrypt";

export async function usersRoutes(fastify, options) {
    // Admin Authorization Guard
    fastify.addHook("onRequest", async (request, reply) => {
        try {
            await request.jwtVerify();
            if (request.user?.role !== "admin") {
                return reply.code(403).send({ error: "Forbidden: Admin role required" });
            }
        } catch (err) {
            return reply.code(401).send({ error: "Unauthorized" });
        }
    });

    // GET / (List Users)
    fastify.get("/", async (request, reply) => {
        const client = await fastify.pg.connect();
        try {
            const result = await client.query(
                "SELECT id, email, role, created_at FROM users"
            );
            return reply.send(result.rows);
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: "Failed to fetch users" });
        } finally {
            client.release();
        }
    });

    // POST / (Create User)
    fastify.post("/", async (request, reply) => {
        const { email, password, role = "agent" } = request.body;
        const client = await fastify.pg.connect();

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const query = `
        INSERT INTO users (email, hashed_password, role)
        VALUES ($1, $2, $3)
        RETURNING id, email, role, created_at;
      `;
            const result = await client.query(query, [email, hashedPassword, role]);
            return reply.code(201).send(result.rows[0]);
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ error: "Failed to create user" });
        } finally {
            client.release();
        }
    });
}