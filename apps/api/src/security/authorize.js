// Fastify preHandler: requireRole("admin", "owner")
export function requireRole(...allowed) {
  return async (req, reply) => {
    const role = req.user?.role || req.identity?.role;
    if (!allowed.includes(role)) return reply.code(403).send({ error: "FORBIDDEN" });
  };
}
