from fastapi import APIRouter, Depends
from app.database import async_session
from app.models.audit_log import AuditLog
from sqlalchemy import select

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("/")
async def list_audit_logs(tenant=Depends(lambda r: r.state.tenant)):
    async with async_session() as session:
        result = await session.execute(
            select(AuditLog)
            .where(AuditLog.tenant_id == tenant.id)
            .order_by(AuditLog.created_at.desc())
            .limit(500)
        )
        return result.scalars().all()
