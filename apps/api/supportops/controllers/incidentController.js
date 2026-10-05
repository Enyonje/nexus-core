/**
 * Incident Management Controller
 * Path: supportops/controllers/incidentsController.js
 */

import { Incident } from "../models/Incident.js";
import { broadcast } from "../realtime/socket.js";

/**
 * Extracts normalized organization/tenant context and user ID from Fastify request
 */
function getAuthContext(request) {
  const orgId =
    request.access?.org?.id ||
    request.tenantId ||
    request.currentUser?.org_id ||
    request.user?.org_id ||
    null;

  const userId =
    request.access?.user?.id ||
    request.currentUser?.id ||
    request.user?.sub ||
    request.user?.id ||
    "system";

  return { orgId, userId };
}

/**
 * Creates a new incident, initializes its timeline, and broadcasts real-time event
 */
export async function createIncident(request, reply) {
  const { orgId, userId } = getAuthContext(request);
  const db = request.server.pg || request.server.prisma;
  const body = request.body || {};

  if (!orgId) {
    return reply.code(400).send({
      error: "MISSING_ORG_CONTEXT",
      message: "Organization ID or tenant context could not be determined",
    });
  }

  try {
    let incident;

    const initialTimeline = [
      {
        message: body.message || "Incident created",
        actor: userId || "system",
        timestamp: new Date(),
      },
    ];

    // Handle Mongoose ORM model
    if (typeof Incident.create === "function") {
      incident = await Incident.create({
        tenantId: orgId,
        org_id: orgId,
        ...body,
        timeline: initialTimeline,
      });
    }
    // Fallback for direct Prisma/PG static helper
    else if (typeof Incident.createIncident === "function") {
      incident = await Incident.createIncident(db, {
        orgId,
        ...body,
        timeline: initialTimeline,
      });
    }

    // Safely emit real-time event
    try {
      broadcast("incident:new", incident);
    } catch (wsErr) {
      request.log.warn({ error: wsErr }, "Realtime broadcast failed for incident:new");
    }

    return reply.code(201).send(incident);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: err.message || "Failed to create incident",
    });
  }
}

/**
 * Retrieves all incidents belonging to the current organization/tenant
 */
export async function listIncidents(request, reply) {
  const { orgId } = getAuthContext(request);
  const db = request.server.pg || request.server.prisma;

  if (!orgId) {
    return reply.code(400).send({
      error: "MISSING_ORG_CONTEXT",
      message: "Organization ID or tenant context could not be determined",
    });
  }

  try {
    let incidents;

    // Handle Mongoose ORM model
    if (typeof Incident.find === "function") {
      incidents = await Incident.find({
        $or: [{ tenantId: orgId }, { org_id: orgId }],
      }).sort({ createdAt: -1 });
    }
    // Fallback for direct Prisma/PG static helper
    else if (typeof Incident.findByOrg === "function") {
      incidents = await Incident.findByOrg(db, orgId);
    } else {
      incidents = [];
    }

    return reply.code(200).send(incidents);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: err.message || "Failed to list incidents",
    });
  }
}

/**
 * Updates incident status or appends a timeline entry, broadcasting real-time updates
 */
export async function updateIncident(request, reply) {
  const { id } = request.params;
  const { status, message } = request.body || {};
  const { userId } = getAuthContext(request);
  const db = request.server.pg || request.server.prisma;

  if (!id) {
    return reply.code(400).send({
      error: "BAD_REQUEST",
      message: "Incident ID parameter is required",
    });
  }

  try {
    let incident;

    // Handle Mongoose ORM document
    if (typeof Incident.findById === "function") {
      incident = await Incident.findById(id);
      if (!incident) {
        return reply.code(404).send({
          error: "NOT_FOUND",
          message: `Incident with ID ${id} was not found`,
        });
      }

      if (status) incident.status = status;

      if (message) {
        if (!Array.isArray(incident.timeline)) {
          incident.timeline = [];
        }
        incident.timeline.push({
          message,
          actor: userId || "operator",
          timestamp: new Date(),
        });
      }

      await incident.save();
    }
    // Fallback for direct Prisma/PG static helper
    else if (typeof Incident.updateIncident === "function") {
      incident = await Incident.updateIncident(db, id, {
        status,
        message,
        actor: userId,
      });

      if (!incident) {
        return reply.code(404).send({
          error: "NOT_FOUND",
          message: `Incident with ID ${id} was not found`,
        });
      }
    }

    // Safely emit real-time update event
    try {
      broadcast("incident:update", incident);
    } catch (wsErr) {
      request.log.warn({ error: wsErr }, "Realtime broadcast failed for incident:update");
    }

    return reply.code(200).send(incident);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({
      error: "INTERNAL_SERVER_ERROR",
      message: err.message || "Failed to update incident",
    });
  }
}

// Default export container
export default {
  createIncident,
  listIncidents,
  updateIncident,
};