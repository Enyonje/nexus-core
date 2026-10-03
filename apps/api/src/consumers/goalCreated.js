import { v4 as uuid } from "uuid";

export async function handleGoalCreated(event, db) {
  const { goalId, steps } = event.payload;

  const executionId = uuid();

  await db.query(
    `
    INSERT INTO executions (id, goal_id, status)
    VALUES ($1, $2, 'PENDING')
    `,
    [executionId, goalId]
  );

  for (let i = 0; i < steps.length; i++) {
    await db.query(
      `
      INSERT INTO execution_steps (
        id, execution_id, position, name, action, input, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      `,
      [
        uuid(),
        executionId,
        i,
        steps[i].name,
        steps[i].action,
        steps[i].input ?? {}
      ]
    );
  }

  await db.query(
    `
    INSERT INTO events (type, payload)
    VALUES ('EXECUTION_CREATED', $1)
    `,
    [{ executionId }]
  );
}
