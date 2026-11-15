# Independent product event integration

Nexus Core receives business activity from independent products through the scoped `POST /api/integrations/events` endpoint. It does not share authentication, user tables, or databases with those products.

## Workspace mapping (required)

Each independent product has its own workspace/tenant IDs. A Nexus integration key belongs to exactly one Nexus business workspace. The product operator must deliberately map a local product workspace to the appropriate Nexus key.

Set these server-side environment variables in each product deployment:

```env
NEXUS_CORE_API_URL=https://nexus-core-a0px.onrender.com
NEXUS_INTEGRATION_TOKENS_JSON={"supportops:SUPPORTOPS_ORG_ID":"nx_int_KEY","socialops:SOCIALOPS_WORKSPACE_ID":"nx_int_KEY"}
```

Use a separate Nexus integration key for each connected product/workspace pair. Do not put tokens in frontend/Vite variables, browser storage, logs, or source control. The JSON value must be valid JSON. The local workspace ID is the key suffix; the token is scoped by Nexus to one destination workspace.

## SupportOps

The SupportOps backend now emits best-effort events for:

- New support ticket
- Reopened support ticket
- New incident
- Updated incident

Events contain operational metadata only (channel, priority, status, severity). Customer names, email addresses, ticket messages, and incident descriptions are not forwarded. Delivery has a 3.5-second timeout and never blocks or fails the SupportOps workflow.

## SocialOps adapter

`integrations/socialops/nexusBusinessEvents.js` is the adapter module for the independent SocialOps API. Copy it into the SocialOps backend (not its frontend) and import it from the publishing/automation service:

```js
import { createNexusBusinessEventClient } from "./nexusBusinessEvents.js";

const emitNexusEvent = createNexusBusinessEventClient({
  product: "socialops",
  department: "grow",
  logger: console,
});

// After a post is successfully published:
void emitNexusEvent(workspaceId, {
  type: "social.post_published",
  title: "Social post published",
  department: "grow",
  metadata: { platform: "instagram", status: "published" },
});

// After a campaign completes:
void emitNexusEvent(workspaceId, {
  type: "social.campaign_completed",
  title: "Social campaign completed",
  department: "grow",
  metadata: { platform: "linkedin", status: "completed" },
});
```

Call it only after the underlying SocialOps action succeeds. Never send post text, customer/user identifiers, access tokens, or private analytics. Because the SocialOps source repository was not part of the Nexus Core project archive used for this implementation, its internal publishing/automation call sites have not been modified here; the adapter is ready to drop into that separate backend.

## Verification

1. Create a separate integration in Nexus Core for each product/workspace pair.
2. Add the token to that product's server-side `NEXUS_INTEGRATION_TOKENS_JSON` mapping.
3. Trigger a ticket/incident or published-post event.
4. Confirm it appears in Business Insights with source `integration:supportops` or `integration:socialops`.
5. Revoke the key in Nexus Core to stop further delivery.
