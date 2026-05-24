// src/routes/admin.js
import { db } from "../db/db.js";
import { runExecution } from "../execution/runner.js";
import rateLimit from "@fastify/rate-limit";
import { requireAuth } from "./auth.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Admin-only routes
 * Mounted at /admin
 */
export async function adminRoutes(server) {
  // Attach stricter rate limiting plugin (per IP)
  await server.register(rateLimit, {
    max: 10,
    timeWindow: "1 minute",
  });

  // Allowed origins list for CORS preflight
  const allowedOrigins = [
    "https://nexusthecore.com",
    "https://nexus-core-chi.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
  ];

  // Preflight CORS handler
  server.options("/*", async (req, reply) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      reply
        .header("Access-Control-Allow-Origin", origin)
        .header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        .header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        .header("Access-Control-Allow-Credentials", "true")
        .send();
    } else {
      reply.code(403).send({ error: "Origin not allowed" });
    }
  });

  // Role guard
  async function requireAdmin(req, reply) {
    if (!req.user || req.user.role !== "admin") {
      reply.code(403).send({ error: "Admin only" });
      return;
    }
  }

  // Permission guard
  async function requirePermission(req, reply, permission) {
    const perms = req.user?.permissions || [];
    if (!perms.includes(permission)) {
      reply.code(403).send({ error: `Missing permission: ${permission}` });
      return;
    }
  }

  // Centralized guard arrays
  const adminReadGuard = [requireAuth, requireAdmin, async (req, reply) => requirePermission(req, reply, "admin:read")];
  const adminWriteGuard = [requireAuth, requireAdmin, async (req, reply) => requirePermission(req, reply, "admin:write")];

  // Audit logging
  async function adminAudit(adminId, action, targetId, meta = {}) {
    try {
      await db.query(
        `INSERT INTO admin_audit (id, admin_id, action, target_id, meta, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
        [uuidv4(), adminId, action, targetId, JSON.stringify(meta), new Date()]
      );
    } catch (err) {
      console.error("Admin audit log failed:", err);
    }
  }

  /* =========================
     HEALTH CHECK
  ========================= */
  server.get("/health", {
    preHandler: adminReadGuard,
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
     USAGE METRICS (for dashboard)
  ========================= */
  server.get("/usage", {
    preHandler: adminReadGuard,
    handler: async (req, reply) => {
      try {
        const users = await db.query(
          `SELECT id, email, subscription, ai_used, executions FROM users ORDER BY created_at DESC`
        );
        return {
          month: new Date().toLocaleString("default", { month: "long" }),
          users: users.rows,
        };
      } catch (err) {
        return reply.code(500).send({ error: "Failed to fetch usage metrics" });
      }
    },
  });

  /* =========================
     EXECUTIONS FEED (for dashboard)
  ========================= */
  server.get("/executions", {
    preHandler: adminReadGuard,
    handler: async (req, reply) => {
      try {
        const executions = await db.query(
          `SELECT id, status, started_at, finished_at FROM executions ORDER BY started_at DESC LIMIT 50`
        );
        return { executions: executions.rows };
      } catch (err) {
        return reply.code(500).send({ error: "Failed to fetch executions" });
      }
    },
  });

  /* =========================
     GOALS MANAGEMENT
  ========================= */
  server.delete("/goals/:id", {
    preHandler: adminWriteGuard,
    handler: async (req, reply) => {
      const { id } = req.params;
      try {
        await db.query(`DELETE FROM goals WHERE id = $1`, [id]);
        await adminAudit(req.user.id, "delete_goal", id);
        return { success: true, message: `Goal ${id} deleted` };
      } catch (err) {
        return reply.code(500).send({ error: "Failed to delete goal" });
      }
    },
  });

  /* =========================
     EXECUTIONS MANAGEMENT
  ========================= */
  server.post("/executions/:id/rerun", {
    preHandler: adminWriteGuard,
    handler: async (req, reply) => {
      const { id } = req.params;
      try {
        await runExecution(id);
        await adminAudit(req.user.id, "rerun_execution", id);
        return { success: true, message: `Execution ${id} rerun started` };
      } catch (err) {
        return reply.code(500).send({ error: "Failed to rerun execution" });
      }
    },
  });

  /* =========================
     USER MANAGEMENT
  ========================= */
  server.post("/users/:id/role", {
    preHandler: adminWriteGuard,
    handler: async (req, reply) => {
      const { id } = req.params;
      const { role } = req.body;

      const allowedRoles = ["user", "admin", "moderator"];
      if (!allowedRoles.includes(role)) {
        return reply.code(400).send({ error: "Invalid role" });
      }

      try {
        await db.query(`UPDATE users SET role = $1 WHERE id = $2`, [role, id]);
        await adminAudit(req.user.id, "update_user_role", id, { newRole: role });
        return { success: true, message: `User ${id} role set to ${role}` };
      } catch (err) {
        return reply.code(500).send({ error: "Failed to update role" });
      }
    },
  });
}
