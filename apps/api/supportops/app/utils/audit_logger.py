from app.database import async_session
from app.models.audit_log import AuditLog

async def log_audit(
    tenant_id: str,
    actor_type: str,
    action: str,
    resource: str,
    actor_id: str = None,
    metadata: dict = None
):
    async with async_session() as session:
        entry = AuditLog(
            tenant_id=tenant_id,
            actor_type=actor_type,
            actor_id=actor_id,
            action=action,
            resource=resource,
            metadata=metadata or {}
        )
        session.add(entry)
        await session.commit()

