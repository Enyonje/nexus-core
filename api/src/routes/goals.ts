export async function goalsRoutes(app: any) {
  app.post("/goals", async (req: any) => {
    return { status: "accepted", goal: req.body };
  });
}
