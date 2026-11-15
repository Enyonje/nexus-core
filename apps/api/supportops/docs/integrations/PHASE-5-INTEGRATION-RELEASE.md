# Phase 5 — Independent product event adapters

## Delivered

- Added a reusable server-side Nexus Business Events client.
- Added SupportOps integration wrapper and event emission for ticket creation, ticket reopening, incident creation, and incident updates.
- Fixed SupportOps ticket event broadcasting to use the correct workspace/event/payload arguments and publish on the SupportOps event bus.
- Added a portable SocialOps adapter and integration examples for successful post publishing and campaign completion.
- Added tenant-mapping and secret-handling documentation.

## Required configuration in each product backend

`NEXUS_CORE_API_URL=https://nexus-core-a0px.onrender.com`

`NEXUS_INTEGRATION_TOKENS_JSON` must be a valid JSON object mapping product-local workspace IDs to Nexus integration tokens. Use namespaced keys:

```json
{
  "supportops:YOUR_SUPPORTOPS_ORG_ID": "nx_int_SUPPORTOPS_KEY",
  "socialops:YOUR_SOCIALOPS_WORKSPACE_ID": "nx_int_SOCIALOPS_KEY"
}
```

Create a different integration credential in Nexus Core for each product/workspace mapping. The token's destination workspace is determined by Nexus Core, not by the event payload.

## Safety and failure behavior

- Product user authentication and databases remain separate.
- Each token is scoped to one Nexus workspace and can only write events.
- Delivery is server-to-server, best-effort, and has a 3.5-second timeout.
- Integration failure never blocks ticket, incident, publishing, or campaign workflows.
- Customer names, email addresses, message bodies, post copy, and access tokens are not forwarded.

## SocialOps source limitation

The SocialOps source repository was not included in the Nexus Core archive available for this phase. The portable adapter is supplied at `integrations/socialops/nexusBusinessEvents.js`, with exact integration examples in `docs/integrations/PRODUCT-EVENT-INTEGRATION.md`. It still needs to be copied into the independent SocialOps API and called after successful publish/campaign actions.

## Validation

- `node --check` passed for all modified/new JavaScript modules.
- A mocked-fetch smoke test verified URL, bearer token, and successful event response.
- No live credentials, remote API, production database, or SocialOps source repo were available for end-to-end testing.
