import Incident from "../models/Incident.js";
import { broadcast } from "../realtime/socket.js";

export async function createIncident(req, res) {
  const incident = await Incident.create({
    tenantId: req.tenantId,
    ...req.body,
    timeline: [{
      message: "Incident created",
      actor: "system"
    }]
  });

  broadcast("incident:new", incident);
  res.status(201).json(incident);
}

export async function listIncidents(req, res) {
  const incidents = await Incident.find({
    tenantId: req.tenantId
  }).sort({ createdAt: -1 });

  res.json(incidents);
}

export async function updateIncident(req, res) {
  const { id } = req.params;
  const { status, message } = req.body;

  const incident = await Incident.findById(id);
  if (!incident) return res.status(404).json({ error: "Not found" });

  if (status) incident.status = status;

  if (message) {
    incident.timeline.push({
      message,
      actor: "operator"
    });
  }

  await incident.save();
  broadcast("incident:update", incident);

  res.json(incident);
}
