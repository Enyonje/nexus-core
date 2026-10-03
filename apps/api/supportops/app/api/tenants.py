from fastapi import APIRouter
from app.database import async_session
from app.models.tenant import Tenant

router = APIRouter(prefix="/tenants", tags=["Tenants"])

@router.post("/")
async def create_tenant(payload: dict):
    async with async_session() as session:
        tenant = Tenant(**payload)
        session.add(tenant)
        await session.commit()
        return tenant

@router.get("/branding")
async def get_branding(tenant=Depends(lambda r: r.state.tenant)):
    return tenant.branding
