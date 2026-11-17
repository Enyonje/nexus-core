import { db } from "../db/db.js";
import { requireAuth } from "../security/authMiddleware.js";

const STAGES = ["new", "qualified", "demo", "proposal", "negotiation", "won", "lost"];
const TYPES = ["call", "email", "demo", "proposal", "meeting", "note"];

export async function salesRoutes(server) {
  async function requireAdmin(req, reply) {
    if (req.user?.role !== "admin") {
      return reply.code(403).send({ error: "Admin only" });
    }
  }

  const readGuard = [requireAuth, requireAdmin];
  const writeGuard = [requireAuth, requireAdmin];

  server.get("/summary", { preHandler: readGuard }, async (_req, reply) => {
    try {
      const since = new Date(Date.now() - 30 * 86400000);
      const [leadCounts, activityCounts, payments, customers, pipeline] = await Promise.all([
        db.query(`
          SELECT
            COUNT(*) FILTER (WHERE created_at >= $1)::int AS leads,
            COUNT(*) FILTER (WHERE created_at >= $1 AND stage IN ('qualified','demo','proposal','negotiation','won'))::int AS qualified,
            COUNT(*) FILTER (WHERE created_at >= $1 AND is_enterprise = TRUE AND stage NOT IN ('lost'))::int AS enterprise,
            COUNT(*) FILTER (WHERE stage = 'won')::int AS won
          FROM sales_leads
        `, [since]),
        db.query(`
          SELECT
            COUNT(*) FILTER (WHERE activity_type = 'demo' AND occurred_at >= $1)::int AS demos,
            COUNT(*) FILTER (WHERE activity_type = 'proposal' AND occurred_at >= $1)::int AS proposals
          FROM sales_activities
        `, [since]),
        db.query(`
          SELECT currency, COALESCE(SUM(amount_paid_cents),0)::bigint AS total_cents,
                 COUNT(*)::int AS payment_count
          FROM sales_payments
          WHERE paid_at >= $1
          GROUP BY currency ORDER BY currency
        `, [since]),
        db.query(`
          SELECT COUNT(DISTINCT organization_id)::int AS paying_customers
          FROM sales_payments
          WHERE organization_id IS NOT NULL AND paid_at >= $1
        `, [since]),
        db.query(`
          SELECT currency, COALESCE(SUM(estimated_value_cents),0)::bigint AS value_cents
          FROM sales_leads
          WHERE stage IN ('qualified','demo','proposal','negotiation')
          GROUP BY currency ORDER BY currency
        `)
      ]);

      return {
        period_days: 30,
        targets: {
          paying_customers: 5,
          qualified_leads: 60,
          demos: 15,
          proposals: 10,
          enterprise_opportunities: 3,
          collected_revenue_usd_cents: 150000
        },
        actual: {
          leads: leadCounts.rows[0].leads,
          qualified_leads: leadCounts.rows[0].qualified,
          enterprise_opportunities: leadCounts.rows[0].enterprise,
          won: leadCounts.rows[0].won,
          demos: activityCounts.rows[0].demos,
          proposals: activityCounts.rows[0].proposals,
          paying_customers: customers.rows[0].paying_customers
        },
        collected_revenue: payments.rows.map((r) => ({
          currency: r.currency,
          amount_cents: Number(r.total_cents),
          payment_count: r.payment_count
        })),
        pipeline: pipeline.rows.map((r) => ({
          currency: r.currency,
          value_cents: Number(r.value_cents)
        })),
        revenue_note: "Revenue includes only Stripe invoices confirmed paid by a verified webhook."
      };
    } catch (err) {
      reqLog(server, "Sales summary failed", err);
      return reply.code(500).send({ error: "Unable to load sales summary" });
    }
  });

  server.get("/leads", { preHandler: readGuard }, async (req, reply) => {
    try {
      const q = String(req.query?.q || "").trim();
      const stage = String(req.query?.stage || "").trim();
      if (stage && !STAGES.includes(stage)) return reply.code(400).send({ error: "Invalid stage" });
      const result = await db.query(`
        SELECT l.*,
          (SELECT COUNT(*)::int FROM sales_activities a WHERE a.lead_id = l.id) AS activity_count,
          (SELECT MAX(occurred_at) FROM sales_activities a WHERE a.lead_id = l.id) AS last_activity
        FROM sales_leads l
        WHERE ($1 = '' OR l.stage = $1)
          AND ($2 = '' OR l.name ILIKE '%' || $2 || '%' OR COALESCE(l.company,'') ILIKE '%' || $2 || '%' OR COALESCE(l.email,'') ILIKE '%' || $2 || '%')
        ORDER BY l.updated_at DESC LIMIT 250
      `, [stage, q]);
      return { leads: result.rows };
    } catch (err) {
      reqLog(server, "Sales leads query failed", err);
      return reply.code(500).send({ error: "Unable to load leads" });
    }
  });

  server.post("/leads", { preHandler: writeGuard }, async (req, reply) => {
    const b = req.body || {};
    const name = String(b.name || "").trim();
    const stage = String(b.stage || "new");
    const value = Number(b.estimated_value_cents || 0);
    if (!name) return reply.code(400).send({ error: "Lead name is required" });
    if (!STAGES.includes(stage)) return reply.code(400).send({ error: "Invalid stage" });
    if (!Number.isSafeInteger(value) || value < 0) return reply.code(400).send({ error: "Invalid estimated value" });
    try {
      const result = await db.query(`
        INSERT INTO sales_leads (name, company, email, phone, source, stage, estimated_value_cents, currency, is_enterprise, notes)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *
      `, [
        name, clean(b.company), clean(b.email), clean(b.phone), clean(b.source),
        stage, value, String(b.currency || "usd").toLowerCase(),
        Boolean(b.is_enterprise), clean(b.notes)
      ]);
      return reply.code(201).send({ lead: result.rows[0] });
    } catch (err) {
      reqLog(server, "Create lead failed", err);
      return reply.code(500).send({ error: "Unable to create lead" });
    }
  });

  server.patch("/leads/:id", { preHandler: writeGuard }, async (req, reply) => {
    const b = req.body || {};
    const stage = b.stage === undefined ? null : String(b.stage);
    if (stage && !STAGES.includes(stage)) return reply.code(400).send({ error: "Invalid stage" });
    const value = b.estimated_value_cents === undefined ? null : Number(b.estimated_value_cents);
    if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
      return reply.code(400).send({ error: "Invalid estimated value" });
    }
    try {
      const result = await db.query(`
        UPDATE sales_leads SET
          name = COALESCE($2,name),
          company = COALESCE($3,company),
          email = COALESCE($4,email),
          phone = COALESCE($5,phone),
          source = COALESCE($6,source),
          stage = COALESCE($7,stage),
          estimated_value_cents = COALESCE($8,estimated_value_cents),
          currency = COALESCE($9,currency),
          is_enterprise = COALESCE($10,is_enterprise),
          notes = COALESCE($11,notes),
          updated_at = NOW()
        WHERE id = $1 RETURNING *
      `, [
        req.params.id, optional(b.name), optional(b.company), optional(b.email),
        optional(b.phone), optional(b.source), stage, value,
        b.currency === undefined ? null : String(b.currency).toLowerCase(),
        b.is_enterprise === undefined ? null : Boolean(b.is_enterprise),
        optional(b.notes)
      ]);
      if (!result.rowCount) return reply.code(404).send({ error: "Lead not found" });
      return { lead: result.rows[0] };
    } catch (err) {
      reqLog(server, "Update lead failed", err);
      return reply.code(500).send({ error: "Unable to update lead" });
    }
  });

  server.post("/leads/:id/activities", { preHandler: writeGuard }, async (req, reply) => {
    const b = req.body || {};
    const type = String(b.activity_type || "");
    const title = String(b.title || "").trim();
    if (!TYPES.includes(type) || !title) {
      return reply.code(400).send({ error: "A valid activity type and title are required" });
    }
    try {
      const result = await db.query(`
        INSERT INTO sales_activities (lead_id, activity_type, title, details)
        VALUES ($1,$2,$3,$4) RETURNING *
      `, [req.params.id, type, title, clean(b.details)]);
      await db.query("UPDATE sales_leads SET updated_at = NOW() WHERE id = $1", [req.params.id]);
      return reply.code(201).send({ activity: result.rows[0] });
    } catch (err) {
      if (err.code === "23503") return reply.code(404).send({ error: "Lead not found" });
      reqLog(server, "Create activity failed", err);
      return reply.code(500).send({ error: "Unable to save activity" });
    }
  });

  server.get("/leads/:id/activities", { preHandler: readGuard }, async (req, reply) => {
    try {
      const result = await db.query(
        "SELECT * FROM sales_activities WHERE lead_id = $1 ORDER BY occurred_at DESC LIMIT 100",
        [req.params.id]
      );
      return { activities: result.rows };
    } catch (err) {
      reqLog(server, "Load activities failed", err);
      return reply.code(500).send({ error: "Unable to load activities" });
    }
  });
}

function clean(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return String(value).trim();
}
function optional(value) {
  return value === undefined ? null : clean(value);
}
function reqLog(server, message, err) {
  server.log?.error?.({ err }, message);
}

// Add the default export so server.js can import it successfully
export default salesRoutes;