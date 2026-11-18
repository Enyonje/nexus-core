
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
test("sales agent routes are admin guarded and expose run lifecycle",()=>{
 const s=fs.readFileSync(path.join(root,"apps/api/src/routes/salesAgents.js"),"utf8");
 for(const token of ["requireAuth","req.user?.role !== \"admin\"","server.post(\"/runs\"","server.get(\"/runs/:id\"","executeSalesWorkflow"]) assert.ok(s.includes(token),token);
});
test("workflow includes all eight agent roles and keeps outreach draft-only",()=>{
 const s=fs.readFileSync(path.join(root,"apps/api/src/agents/salesWorkflow.js"),"utf8");
 for(const token of ["Market Research Agent","Lead Discovery Agent","Lead Enrichment Agent","Lead Qualification Agent","Sales Intelligence Agent","Outreach Agent","Follow-up Agent","Opportunity Management Agent","None sent"]) assert.ok(s.includes(token),token);
});
test("server mounts sales agent API and admin UI includes the panel",()=>{
 const server=fs.readFileSync(path.join(root,"apps/api/src/server.js"),"utf8");
 const ui=fs.readFileSync(path.join(root,"apps/ui/src/components/AdminDashboard.jsx"),"utf8");
 assert.ok(server.includes('mountBoth("admin/sales-agents", salesAgentsRoutesMod, "admin/sales-agents")'));
 assert.ok(ui.includes("<SalesAgentsPanel />"));
});
