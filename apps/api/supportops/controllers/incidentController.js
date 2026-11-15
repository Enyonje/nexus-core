import { Incident, INCIDENT_SEVERITY, INCIDENT_STATUS } from "../models/Incident.js";
import { push } from "../routes/realtime.js";
import { emitSupportOpsBusinessEvent } from "../services/nexusBusinessEvents.js";

const severities = Object.values(INCIDENT_SEVERITY);
const statuses = Object.values(INCIDENT_STATUS);
const context = (req) => ({ orgId: req.access?.org?.id, userId: req.user?.id || null });
const db = (req) => req.server.pg;

export async function createIncident(req, reply) {
  const { orgId, userId } = context(req);
  if (!orgId) return reply.code(403).send({ error: "WORKSPACE_REQUIRED" });
  const body = req.body || {};
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) return reply.code(400).send({ error: "TITLE_REQUIRED", message: "Incident title is required." });
  const severity = body.severity || INCIDENT_SEVERITY.MEDIUM;
  if (!severities.includes(severity)) return reply.code(400).send({ error: "INVALID_SEVERITY" });
  try {
    const incident = await Incident.create(db(req), {
      orgId, reportedBy: userId, ticketId: body.ticketId || null, executionId: body.executionId || null,
      title, description: typeof body.description === "string" ? body.description.slice(0, 10000) : "",
      category: typeof body.category === "string" ? body.category.slice(0, 80) : "general",
      severity, status: INCIDENT_STATUS.OPEN, assignedTo: body.assignedTo || null,
      metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {},
    });
    push(orgId, "INCIDENT_CREATED", incident);
    void emitSupportOpsBusinessEvent(orgId, { type: "support.incident_created", title: "Support incident created", department: "serve", metadata: { severity, status: incident.status } }).catch((e) => req.log.warn({ err: e }, "Nexus activity event delivery failed"));
    return reply.code(201).send(incident);
  } catch (err) {
    req.log.error({ err }, "Incident creation failed");
    return reply.code(500).send({ error: "INCIDENT_CREATE_FAILED", message: "Unable to create incident." });
  }
}

export async function listIncidents(req, reply) {
  const { orgId } = context(req);
  if (!orgId) return reply.code(403).send({ error: "WORKSPACE_REQUIRED" });
  const { status, severity } = req.query || {};
  if (status && !statuses.includes(status)) return reply.code(400).send({ error: "INVALID_STATUS" });
  if (severity && !severities.includes(severity)) return reply.code(400).send({ error: "INVALID_SEVERITY" });
  const limit = Math.min(Math.max(Number.parseInt(req.query?.limit, 10) || 50, 1), 100);
  const offset = Math.max(Number.parseInt(req.query?.offset, 10) || 0, 0);
  try {
    return await Incident.findAll(db(req), { orgId, status, severity, limit, offset });
  } catch (err) {
    req.log.error({ err }, "Incident listing failed");
    return reply.code(500).send({ error: "INCIDENT_LIST_FAILED", message: "Unable to load incidents." });
  }
}

export async function updateIncident(req, reply) {
  const { orgId, userId } = context(req);
  if (!orgId) return reply.code(403).send({ error: "WORKSPACE_REQUIRED" });
  const body = req.body || {};
  if (body.status && !statuses.includes(body.status)) return reply.code(400).send({ error: "INVALID_STATUS" });
  if (!body.status && body.assignedTo === undefined && body.resolutionSummary === undefined) {
    return reply.code(400).send({ error: "NO_CHANGES", message: "Provide a status, assignee or resolution summary." });
  }
  try {
    const incident = await Incident.updateStatus(db(req), req.params.id, {
      orgId, status: body.status || null, assignedTo: body.assignedTo ?? null,
      resolutionSummary: typeof body.resolutionSummary === "string" ? body.resolutionSummary.slice(0, 5000) : null,
    });
    if (!incident) return reply.code(404).send({ error: "INCIDENT_NOT_FOUND" });
    push(orgId, "INCIDENT_UPDATED", { ...incident, actorId: userId });
    void emitSupportOpsBusinessEvent(orgId, { type: "support.incident_updated", title: "Support incident updated", department: "serve", metadata: { status: incident.status } }).catch((e) => req.log.warn({ err: e }, "Nexus activity event delivery failed"));
    return incident;
  } catch (err) {
    req.log.error({ err }, "Incident update failed");
    return reply.code(500).send({ error: "INCIDENT_UPDATE_FAILED", message: "Unable to update incident." });
  }
}
