from fastapi import APIRouter
from app.services.branding_service import get_branding_for_tenant

router = APIRouter(prefix="/branding", tags=["Branding"])

@router.get("/me")
async def get_my_branding():
    # TEMP: tenant resolution will later come from auth / domain
    tenant_id = "demo-tenant"
    return await get_branding_for_tenant(tenant_id)
