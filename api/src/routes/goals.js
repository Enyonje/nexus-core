export async function goalsRoutes(app: any) {
  app.post("/goals", async (req: any) => {
    return { status: "accepted", goal: req.body };
  });

  app.get("/goals", async (req: any) => {
    const userId = req.identity?.sub;
    const result = await app.pg.query(
      "SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return result.rows;
  });
}