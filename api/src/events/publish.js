export async function publishEvent(db, identity, type, payload) {
  const { rowCount } = await db.query(
    `
    SELECT 1 FROM event_permissions
    WHERE event_type = $1 AND role = $2
    `,
    [type, identity.role]
  );

  if (!rowCount) {
    throw new Error("Event not permitted");
  }

  await db.query(
    `INSERT INTO events (type, payload) VALUES ($1, $2)`,
    [type, payload]
  );
}
