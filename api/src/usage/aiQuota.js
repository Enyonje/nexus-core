import { db } from "../db/db.js";

const LIMITS = {
  free: 5,
  pro: 500,
  enterprise: Infinity,
  admin: Infinity,
};

export async function checkAiQuota(user) {
  const tier = user.role === "admin" ? "admin" : user.subscription;
  const limit = LIMITS[tier] ?? 0;

  if (limit === Infinity) return true;

  const month = new Date().toISOString().slice(0, 7);

  const { rows } = await db.query(
    `
    SELECT count FROM usage_ai
    WHERE user_id = $1 AND month = $2
    `,
    [user.id, month]
  );

  const used = rows[0]?.count ?? 0;

  if (used >= limit) {
    throw new Error("AI quota exceeded for this month");
  }

  return true;
}

export async function incrementAiUsage(user) {
  const month = new Date().toISOString().slice(0, 7);

  await db.query(
    `
    INSERT INTO usage_ai (user_id, month, count)
    VALUES ($1, $2, 1)
    ON CONFLICT (user_id, month)
    DO UPDATE SET count = usage_ai.count + 1
    `,
    [user.id, month]
  );
}
