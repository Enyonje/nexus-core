import { db } from "../db/db.js";

/**
 * Admin-only routes
 * Mounted at /admin
 */
export async function adminRoutes(server) {
  /**
   * GET /admin/usage
   * View AI usage per user (current month)
   */
  server.get("/usage", {
    preHandler: async (req, reply) => {
      if (req.user?.role !== "admin") {
        return reply.code(403).send({ error: "Admin only" });
      }
    },
    handler: async () => {
      const month = new Date().toISOString().slice(0, 7);

      const { rows } = await db.query(`
        SELECT
          u.id,
          u.email,
          u.subscription,
          u.role,
          COALESCE(ua.count, 0) AS ai_used,
          (
            SELECT COUNT(*)
            FROM executions e
            JOIN goals g ON g.id = e.goal_id
            WHERE g.user_id = u.id
          ) AS executions
        FROM users u
        LEFT JOIN usage_ai ua
          ON ua.user_id = u.id
         AND ua.month = $1
        ORDER BY ai_used DESC
      `, [month]);

      return { month, users: rows };
    },
  });
}
