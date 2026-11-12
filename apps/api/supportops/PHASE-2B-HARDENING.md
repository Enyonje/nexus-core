# SupportOps Phase 2B – webhook, billing and data-integrity hardening

This patch is an overlay for the Phase 2 independent SupportOps API. Extract it at the repository root and allow the listed files to merge/replace their existing counterparts.

## What changed

- The independent API now registers the billing module's Stripe webhook handler at both `/api/v1/supportops/webhooks/stripe` and `/api/supportops/webhooks/stripe`. That handler verifies Stripe's raw-body signature, records event IDs for idempotency, synchronizes subscription status, and invalidates entitlement cache entries. The old log-only Stripe handler is no longer mounted.
- The old `stripeWebhook.js` module now re-exports the canonical billing webhook plugin for compatibility with any remaining import.
- The obsolete global WhatsApp/Twilio/email webhook routes now return HTTP 410 with migration guidance; they no longer write through the removed `prisma.ticket` model or use a shared default verification token.
- Per-workspace channel webhooks remain the supported inbound path. They resolve a channel by its opaque webhook token, validate provider signatures/secrets, deduplicate provider event IDs, and create tickets through the existing `SupportCustomer`, `SupportTicket`, and `SupportTicketMessage` Prisma models.
- Channel credential encryption now fails startup if `CHANNELS_ENC_KEY` is absent or invalid. It no longer pretends an ephemeral key can safely be used. Keep the same key that encrypted existing `Channel.config_enc` values.
- The channel webhook URL now points at `PUBLIC_API_URL` (defaulting to the independent SupportOps Render service), not the Nexus Core API.
- WhatsApp/Messenger use Meta HMAC signatures; voice uses Twilio signatures; Postmark inbound email accepts its configured Basic Auth password or `X-Postmark-Server-Token`; SMS requires `X-Channel-API-Key` or Bearer authentication matching the channel's stored API key. Unknown channel types fail closed.
- Dashboard metrics are scoped to the authorized organization. Fabricated revenue, SLA, response-time, CSAT and AI-resolution values have been removed; unavailable instrumentation is explicitly returned as `null`/an empty state rather than invented data.
- Added unit tests for provider signature/shared-secret checks and WhatsApp normalization.

## Required environment configuration

Set these on the **SupportOps Render service**, not the Nexus Core API service:

- `DATABASE_URL`: keep the existing database URL during this migration. Do not create or migrate to a new database in this phase.
- `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`: preserve the existing compatible identity contract during the transition. Do not rotate the secret while users still hold existing tokens.
- `PUBLIC_API_URL=https://supportops-ai.onrender.com` (or the final public API hostname if changed).
- `FRONTEND_URL=https://supportops.nexusthecore.com`.
- `CORS_ALLOWED_ORIGINS=https://supportops.nexusthecore.com`.
- `CHANNELS_ENC_KEY`: the persistent base64-encoded 32-byte key used to encrypt channel credentials. Generate a new key only if there are no existing encrypted channel credentials, or after planning a controlled re-encryption migration. Never replace an existing production key casually.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`: use the SupportOps Stripe account/mode and the webhook endpoint path above. Keep existing values if this is the same Stripe endpoint/account.
- `REDIS_URL`: recommended when running more than one API instance; without it, realtime uses single-instance in-memory delivery.
- Retain existing email/provider credentials required by your configured channels.

Generate a new encryption key only for a fresh installation:

```bash
openssl rand -base64 32
```

## Stripe Dashboard

Configure the SupportOps webhook destination as:

`https://supportops-ai.onrender.com/api/v1/supportops/webhooks/stripe`

Subscribe at minimum to:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

The handler is idempotent by Stripe event ID. Do not configure the old log-only route as a second active destination for the same product.

## Provider webhook URLs

Connect each channel through SupportOps Admin > Channels. The API returns an organization-specific URL of the form:

`https://supportops-ai.onrender.com/api/v1/supportops/tickets/channels/webhook/{channelKey}/{opaqueToken}`

Use the URL and verification information returned for that organization. Do not use the legacy global `/webhooks/whatsapp`, `/webhooks/twilio/voice`, or `/webhooks/email` endpoints; those handlers referenced an obsolete `Ticket` model and did not safely isolate tenants.

For inbound email, configure Postmark Basic Authentication (password equal to the channel's configured inbound token) or send `X-Postmark-Server-Token`. For SMS, the provider/proxy must send `X-Channel-API-Key` matching the configured channel API key. If the provider cannot do this, do not expose the endpoint publicly; add a provider-specific signature adapter first.

## Database compatibility and migration safety

The current schema already defines `Channel`, `InboundEvent`, `SupportCustomer`, `SupportTicket`, `SupportTicketMessage`, `Organization`, `Membership`, `Subscription`, `Plan`, `AppAccess`, and `StripeEvent`. This patch does not modify the Prisma schema and does not run migrations. The inbound ticket service writes to the current `support_*` models; it does not use the obsolete `prisma.ticket` model.

No data copy, table rename, database split, or destructive migration is part of Phase 2B. Keep the existing shared database until a separate, rehearsed migration plan is approved.

## Validation

From `apps/api` run:

```bash
node --test supportops/routes/inbound.test.js
node --check supportops/server.js
node --check supportops/routes/channelsRoutes.js
node --check supportops/routes/dashboard.js
node --check supportops/routes/inbound.js
node --check supportops/routes/stripeWebhook.js
```

Then run the repository's normal `npm test` and `npm run build` in the actual project environment. A live test still requires your Render environment, database, Stripe test endpoint, provider credentials, and Redis configuration. Do not switch production traffic based only on local syntax/unit tests.

## Deployment caution

Do not change Render's start command or deploy this patch until the Phase 2 overlay is present in the same repository and its dependencies/build succeed. Keep the currently working production service and database available for rollback. Verify `/health`, `/api/v1/system/health`, login, pricing, checkout in Stripe test mode, subscription updates, ticket creation, and a live test webhook before changing DNS or routing.
