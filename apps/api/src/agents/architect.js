import { db } from "../db/db.js";
import { generatePlan } from "../llm/client.js";

export async function createExecution(goal) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const execRes = await client.query(
      `
      INSERT INTO executions (goal, status)
      VALUES ($1, 'pending')
      RETURNING *
      `,
      [goal]
    );

    const execution = execRes.rows[0];

    let plan;
    try {
      plan = await generatePlan(goal);
    } catch (err) {
      await client.query(
        `UPDATE executions SET status = 'failed' WHERE id = $1`,
        [execution.id]
      );
      throw err;
    }

    if (!plan?.steps || !Array.isArray(plan.steps)) {
      throw new Error("Invalid plan structure");
    }

    for (let i = 0; i < plan.steps.length; i++) {
      await client.query(
        `
        INSERT INTO execution_steps
        (execution_id, step_index, description, status)
        VALUES ($1, $2, $3, 'pending')
        `,
        [
          execution.id,
          i,
          plan.steps[i].description
        ]
      );
    }

    await client.query(
      `UPDATE executions SET status = 'running' WHERE id = $1`,
      [execution.id]
    );

    await client.query("COMMIT");
    return execution;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
