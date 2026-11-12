# Phase 3A — SupportOps database split preflight

## Scope

This patch prepares and audits the database split. It does **not** change the
SupportOps Node API's Prisma connection, copy rows, run migrations, or switch
production traffic. Keep the current `DATABASE_URL` in Render until a later
cutover patch has been tested.

## Findings from the repository snapshot

1. The SupportOps Node server imports `@prisma/client` generated from
   `apps/api/prisma/schema.prisma`, which currently includes Nexus Core models
   (`User`, `Goal`, `Execution`, etc.) alongside SupportOps models.
2. SupportOps models also have foreign-key dependencies on shared `users`,
   `organizations`, and app/billing tables. They cannot be moved by copying
   only tickets and messages.
3. The repository contains multiple Python SQLAlchemy database entry points.
   At least one legacy module contained a hardcoded database credential; this
   patch removes that inline credential and requires environment configuration.
4. The SupportOps database boundary is therefore not yet clean enough for a
   safe one-step `DATABASE_URL` switch.

## Immediate security action

Treat the database credential previously embedded in `apps/api/supportops/app/db.py`
 as compromised. Rotate it at the database provider, update Render secrets, and
review repository history/CI logs for exposure. This patch does not print or
repeat the credential. If the repository was public, also remove the secret
from Git history using your normal incident-response process after rotation.

## Read-only preflight

Run from `apps/api` after creating a separate, empty PostgreSQL database:

```bash
SUPPORTOPS_SOURCE_DATABASE_URL='postgresql://...current-source...' \\
SUPPORTOPS_TARGET_DATABASE_URL='postgresql://...new-empty-target...' \\
node supportops/scripts/db-preflight.js
```

The script only connects and runs `SELECT`, catalog queries and `COUNT(*)`.
It refuses to proceed if source and target resolve to the same host/database.
It reports required table counts, missing tables, foreign-key relationships,
and whether the target's `public` schema is empty. It does not create or alter
any database object or row.

Required source tables include identity/organization and billing dependencies
as well as SupportOps operational tables. A non-empty target is not accepted
by this preflight; do not point it at a database containing unrelated data.

## Why the actual migration is deferred

The current Prisma schema mixes Nexus Core and SupportOps models. The target
schema must be generated from an explicit SupportOps-owned model set, including
its own identity references, organization membership, product entitlement and
billing references. We must first decide whether users are duplicated as
SupportOps-local identities or represented by a stable external identity ID.
The latter is the recommended long-term design, but it requires an explicit
identity federation contract and token verification plan.

A data migration must preserve primary keys, Stripe customer/subscription IDs,
webhook idempotency records, encrypted channel configuration, ticket/message
relationships, and timestamps. It also needs a verified rollback and a write
freeze/dual-write strategy. No automatic export/import is included in this
preflight patch because the current ownership boundaries are ambiguous.

## Do not do yet

- Do not change Render's SupportOps `DATABASE_URL`.
- Do not run `prisma migrate reset`, `db push`, `DROP`, or `TRUNCATE`.
- Do not delete SupportOps tables from the Nexus Core database.
- Do not create a new encryption key for existing channel credentials.
- Do not copy Stripe webhook events without preserving their IDs.

## Acceptance criteria for the next phase

- Dedicated SupportOps Prisma schema contains no Nexus Core execution/goal models.
- Every SupportOps table has an explicit owner and migration mapping.
- Identity, organization, membership, entitlements and billing references are
  resolved without cross-database foreign keys.
- Source/target row counts and relationship checks match after migration.
- Application smoke tests pass against the target before traffic cutover.
