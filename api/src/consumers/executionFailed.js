export async function handleExecutionFailed(event, db) {
  const { executionId, reason } = event.payload;

  await db.query(
    `
    UPDATE executions
    SET failure_reason = $2
    WHERE id = $1
    `,
    [executionId, reason]
  );

  // future: alerting / escalation / sentinel
}
