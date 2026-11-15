import { createNexusBusinessEventClient } from "../../integrations/nexusBusinessEvents.js";

const emit = createNexusBusinessEventClient({
  product: "supportops",
  department: "serve",
});

export async function emitSupportOpsBusinessEvent(orgId, event) {
  return emit(orgId, event);
}
