import { db } from "../db/db.js";
import { runExecution } from "../execution/runner.js";

/**
 * Admin-only routes
 * Mounted at /admin
 */
export async function adminRoutes(server) {
  // Simple role guard
  async function requireAdmin(req, reply) {
    if (!req.user || req.user.role !== "admin") {
      return reply.code(403).send({ error: "Admin only" });
    }
  }

  /* =========================
     USAGE OVERVIEW
  ========================= */
  server.get("/usage", {
    preHandler: requireAdmin,
    handler: async () => {
      const month = new Date().toISOString().slice(0, 7);

      const { rows } = await db.query(
        `
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
        `,
        [month]
      );

      return { month, users: rows };
    },
  });

  /* =========================
     ALL GOALS
  ========================= */
  server.get("/goals", {
    preHandler: requireAdmin,
    handler: async () => {
      const { rows } = await db.query(
        `
        SELECT g.*, u.email AS user_email
        FROM goals g
        JOIN users u ON u.id = g.user_id
        ORDER BY g.created_at DESC
        `
      );
      return { goals: rows };
    },
  });

  // Admin delete goal
  server.delete("/goals/:id", {
    preHandler: requireAdmin,
    handler: async (req, reply) => {
      const { id } = req.params;
      await db.query(`DELETE FROM goals WHERE id = $1`, [id]);
      return { success: true, message: `Goal ${id} deleted` };
    },
  });

  /* =========================
     ALL EXECUTIONS
  ========================= */
  server.get("/executions", {
    preHandler: requireAdmin,
    handler: async () => {
      const { rows } = await db.query(
        `
        SELECT e.*, u.email AS user_email
        FROM executions e
        JOIN users u ON u.id = e.user_id
        ORDER BY e.started_at DESC NULLS LAST
        `
      );
      return { executions: rows };
    },
  });

  // Admin rerun execution
  server.post("/executions/:id/rerun", {
    preHandler: requireAdmin,
    handler: async (req, reply) => {
      const { id } = req.params;
      await runExecution(id);
      return { success: true, message: `Execution ${id} rerun started` };
    },
  });

  /* =========================
     USER MANAGEMENT
  ========================= */
  server.post("/users/:id/subscription", {
    preHandler: requireAdmin,
    handler: async (req, reply) => {
      const { id } = req.params;
      const { tier } = req.body; // e.g. "free", "pro", "enterprise"
      await db.query(`UPDATE users SET subscription = $1 WHERE id = $2`, [
        tier,
        id,
      ]);
      return { success: true, message: `User ${id} subscription set to ${tier}` };
    },
  });

  server.post("/users/:id/role", {
    preHandler: requireAdmin,
    handler: async (req, reply) => {
      const { id } = req.params;
      const { role } = req.body; // e.g. "user", "admin"
      await db.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, id]);
      return { success: true, message: `User ${id} role set to ${role}` };
    },
  });
}