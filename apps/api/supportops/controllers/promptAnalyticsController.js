/**
 * Prompt Performance Analytics Controller
 * Path: supportops/controllers/promptPerformanceController.js
 */

import { AIPromptMetric } from "../models/AIPromptMetric.js";

/**
 * Extracts normalized organization context from Fastify request
 */
function getAuthContext(request) {
  const orgId =
    request.access?.org?.id ||
    request.currentUser?.org_id ||
    request.user?.orgId ||
    request.user?.org_id ||
    null;

  return { orgId };
}

/**
 * Aggregates performance metrics (runs, resolution rate, average confidence) per prompt version
 */
export async function promptPerformance(request, reply) {
  const { orgId } = getAuthContext(request);
  const prisma = request.server.prisma;
  const pg = request.server.pg;

  try {
    let stats = [];

    // Path 1: MongoDB / Mongoose aggregation
    if (typeof AIPromptMetric.aggregate === "function") {
      const matchStage = orgId ? { $match: { org_id: orgId } } : null;

      const pipeline = [
        ...(matchStage ? [matchStage] : []),
        {
          $group: {
            _id: "$promptVersion",
            promptVersion: { $first: "$promptVersion" },
            runs: { $sum: 1 },
            autoResolved: {
              $sum: { $cond: ["$autoResolved", 1, 0] },
            },
            avgConfidence: { $avg: "$confidence" },
          },
        },
        { $sort: { runs: -1 } },
      ];

      const rawStats = await AIPromptMetric.aggregate(pipeline);

      stats = rawStats.map((item) => {
        const runs = item.runs || 0;
        const autoResolved = item.autoResolved || 0;
        const avgConfidence = parseFloat((item.avgConfidence || 0).toFixed(4));
        const successRate = runs > 0 ? Math.round((autoResolved / runs) * 100) : 0;

        return {
          promptVersion: item.promptVersion || item._id || "v1.0",
          runs,
          autoResolved,
          successRate,
          avgConfidence,
        };
      });
    }
    // Path 2: Prisma ORM SQL aggregation fallback
    else if (prisma && typeof prisma.$queryRawUnsafe === "function") {
      const rawStats = await prisma.$queryRawUnsafe(`
        SELECT 
          prompt_version AS "promptVersion",
          COUNT(*)::int AS "runs",
          COUNT(*) FILTER (WHERE auto_resolved = true)::int AS "autoResolved",
          COALESCE(AVG(confidence), 0)::float AS "avgConfidence"
        FROM ai_prompt_metrics
        WHERE ($1::text IS NULL OR org_id = $1)
        GROUP BY prompt_version
        ORDER BY runs DESC
      `, orgId);

      stats = rawStats.map((row) => {
        const runs = Number(row.runs || 0);
        const autoResolved = Number(row.autoResolved || 0);
        const avgConfidence = parseFloat((row.avgConfidence || 0).toFixed(4));
        const successRate = runs > 0 ? Math.round((autoResolved / runs) * 100) : 0;

        return {
          promptVersion: row.promptVersion || "v1.0",
          runs,
          autoResolved,
          successRate,
          avgConfidence,
        };
      });
    }
    // Path 3: Direct Fastify Postgres (pg) fallback
    else if (pg) {
      const client = await pg.connect();
      try {
        const result = await client.query(`
          SELECT 
            prompt_version AS "promptVersion",
            COUNT(*)::int AS "runs",
            COUNT(*) FILTER (WHERE auto_resolved = true)::int AS "autoResolved",
            COALESCE(AVG(confidence), 0)::float AS "avgConfidence"
          FROM ai_prompt_metrics
          WHERE ($1::text IS NULL OR org_id = $1)
          GROUP BY prompt_version
          ORDER BY runs DESC
        `, [orgId]);

        stats = result.rows.map((row) => {
          const runs = Number(row.runs || 0);
          const autoResolved = Number(row.autoResolved || 0);
          const avgConfidence = parseFloat((row.avgConfidence || 0).toFixed(4));
          const successRate = runs > 0 ? Math.round((autoResolved / runs) * 100) : 0;

          return {
            promptVersion: row.promptVersion || "v1.0",
            runs,
            autoResolved,
            successRate,
            avgConfidence,
          };
        });
      } finally {
        client.release();
      }
    }

    return reply.code(200).send(stats);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: err.message || "Failed to calculate prompt performance metrics",
    });
  }
}

// Default export container
export default {
  promptPerformance,
};