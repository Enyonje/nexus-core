from fastapi import Request
from app.database import async_session
from app.models.tenant import Tenant

async def resolve_tenant(request: Request):
    domain = request.headers.get("x-tenant-domain")

    async with async_session() as session:
        result = await session.execute(
            Tenant.__table__.select().where(Tenant.domain == domain)
        )
        tenant = result.fetchone()

        if not tenant:
            raise Exception("Tenant not found")

        request.state.tenant = tenant
