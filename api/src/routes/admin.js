// src/routes/admin.js
import { db } from "../db/db.js";
import { runExecution } from "../execution/runner.js";
import rateLimit from "@fastify/rate-limit";

/**
 * Admin-only routes
 * Mounted at /admin
 */
export async function adminRoutes(server) {
  // Attach rate limiting plugin (per IP)
  await server.register(rateLimit, {
    max: 50,
    timeWindow: "1 minute",
  });

  // Role guard
  async function requireAdmin(req, reply) {
    if (!req.user || req.user.role !== "admin") {
      return reply.code(403).send({ error: "Admin only" });
    }
  }

  // Permission guard
  async function requirePermission(req, reply, permission) {
    const perms = req.user?.permissions || [];
    if (!perms.includes(permission)) {
      return reply.code(403).send({ error: `Missing permission: ${permission}` });
    }
  }

  /* =========================
     HEALTH CHECK
  ========================= */
  server.get("/health", {
    preHandler: async (req, reply) => {
      await requireAdmin(req, reply);
      await requirePermission(req, reply, "admin:read");
    },
    handler: async () => {
      try {
        await db.query("SELECT 1");
        return { status: "ok", time: new Date().toISOString() };
      } catch (err) {
        return { status: "error", detail: err.message };
      }
    },
  });

  /* =========================
     GOALS MANAGEMENT
  ========================= */
  server.delete("/goals/:id", {
    preHandler: async (req, reply) => {
      await requireAdmin(req, reply);
      await requirePermission(req, reply, "admin:write");
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      try {
        await db.query(`DELETE FROM goals WHERE id = $1`, [id]);
        console.log(`[ADMIN] ${req.user.email} deleted goal ${id}`);
        return { success: true, message: `Goal ${id} deleted` };
      } catch (err) {
        return reply.code(500).send({ error: "Failed to delete goal", detail: err.message });
      }
    },
  });

  /* =========================
     EXECUTIONS MANAGEMENT
  ========================= */
  server.post("/executions/:id/rerun", {
    preHandler: async (req, reply) => {
      await requireAdmin(req, reply);
      await requirePermission(req, reply, "admin:write");
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      try {
        await runExecution(id);
        console.log(`[ADMIN] ${req.user.email} reran execution ${id}`);
        return { success: true, message: `Execution ${id} rerun started` };
      } catch (err) {
        return reply.code(500).send({ error: "Failed to rerun execution", detail: err.message });
      }
    },
  });

  /* =========================
     USER MANAGEMENT
  ========================= */
  server.post("/users/:id/role", {
    preHandler: async (req, reply) => {
      await requireAdmin(req, reply);
      await requirePermission(req, reply, "admin:write");
    },
    handler: async (req, reply) => {
      const { id } = req.params;
      const { role } = req.body;
      try {
        await db.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, id]);
        console.log(`[ADMIN] ${req.user.email} set role for user ${id} to ${role}`);
        return { success: true, message: `User ${id} role set to ${role}` };
      } catch (err) {
        return reply.code(500).send({ error: "Failed to update role", detail: err.message });
      }
    },
  });
}