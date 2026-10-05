/**
 * Incident Management Routes
 * Path: supportops/routes/incidents.js
 */

import auth from "../middleware/auth.js";
import tenantContext from "../middleware/tenantContext.js";
import {
  createIncident,
  listIncidents,
  updateIncident
} from "../controllers/incidentController.js";

export default async function incidentsRoutes(app) {
  // Apply middleware equivalents as Fastify preHandlers
  const preHandlers = [auth, tenantContext];

  // GET /api/v1/supportops/incidents
  app.get(
    "/",
    { preHandler: preHandlers },
    async (req, reply) => {
      return listIncidents(req, reply);
    }
  );

  // POST /api/v1/supportops/incidents
  app.post(
    "/",
    { preHandler: preHandlers },
    async (req, reply) => {
      return createIncident(req, reply);
    }
  );

  // PATCH /api/v1/supportops/incidents/:id
  app.patch(
    "/:id",
    { preHandler: preHandlers },
    async (req, reply) => {
      return updateIncident(req, reply);
    }
  );
}

// Named export for backward compatibility
export { incidentsRoutes };
