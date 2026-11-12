# SupportOps independent API (Phase 2A)

This service is started independently from the Nexus Core API with:

```bash
cd apps/api
node supportops/server.js
```

For Render, set the service root directory to `apps/api` and the start command to `node supportops/server.js`. The service listens on `PORT` (default `10000`).

## Important migration boundary

This is an independently running Node/Fastify API process and it mounts the existing SupportOps route plugins directly. It no longer needs the Nexus Core `server.js` process to register or serve those routes. The SupportOps Prisma adapter is local to this service, and the auth/entitlement adapters are now owned by `apps/api/supportops`.

**The database is intentionally still shared during this migration.** The current Prisma schema defines both Nexus Core identity/workspace tables and SupportOps ticket/channel tables. Existing SupportOps route handlers also depend on those shared tables. Do not point this service at a new empty database yet; that would break existing customers. A dedicated SupportOps database and data migration are a later phase after schema/table ownership and identity federation are designed.

## Identity compatibility

The local SupportOps API validates the existing JWT contract (`JWT_ISSUER=nexus-api`, `JWT_AUDIENCE=nexus-client`) and resolves the user from the current database. This preserves compatibility with existing sessions during migration; it is not yet a separate OIDC identity provider. Both services must use the same JWT secret until the planned identity-federation migration.

## Required environment

Copy `.env.example` into the service environment and populate real secrets. Do not commit `.env`. Set `FRONTEND_URL` and `APP_URL` to `https://supportops.nexusthecore.com`. Configure `REDIS_URL` for multi-instance realtime. Without Redis, realtime reports single-instance mode and is not production-grade across multiple instances.

## Known pre-deployment gate

The old `routes/auth.js` demo endpoint is deliberately not mounted. A new database-backed `/api/v1/supportops/login`, `/api/v1/supportops/me`, and `/api/v1/supportops/logout` flow is owned by SupportOps. It validates existing user password hashes and signs tokens using the current shared issuer/audience contract. This preserves the existing account store while removing the demo identity. The shared JWT secret remains a temporary federation contract and must be rotated only after a coordinated identity migration. Run route-level smoke tests against the real database and Stripe test mode before switching traffic.
