from app.models.tenant_branding import TenantBranding
from app.database import async_session

async def get_branding_for_tenant(tenant_id: str):
    async with async_session() as session:
        branding = (
            await session.execute(
                TenantBranding.__table__.select().where(
                    TenantBranding.tenant_id == tenant_id
                )
            )
        ).first()

        if branding:
            return branding[0]

        # fallback defaults
        return {
            "app_name": "SupportOps",
            "primary_color": "#2563EB",
            "accent_color": "#6366F1",
            "logo_url": None,
            "white_label": False,
        }
