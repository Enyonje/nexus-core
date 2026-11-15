/** Workspace-scoped SupportOps incident routes. */
import { guard } from "../security/entitlements.js";
import { createIncident, listIncidents, updateIncident } from "../controllers/incidentController.js";

export default async function incidentsRoutes(app) {
  const staff = guard({ app: "supportops", roles: ["agent", "management", "admin"] });
  const managers = guard({ app: "supportops", roles: ["management", "admin"] });

  app.get("/", { preHandler: staff }, listIncidents);
  app.post("/", { preHandler: staff }, createIncident);
  app.patch("/:id", { preHandler: managers }, updateIncident);
}

export { incidentsRoutes };
