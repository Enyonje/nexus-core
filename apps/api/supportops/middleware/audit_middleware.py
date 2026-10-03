from fastapi import Request
from app.utils.audit_logger import log_audit

async def audit_middleware(request: Request, call_next):
    response = await call_next(request)

    tenant = getattr(request.state, "tenant", None)

    if tenant:
        await log_audit(
            tenant_id=tenant.id,
            actor_type="system",
            action=request.method,
            resource=request.url.path,
            metadata={
                "status_code": response.status_code,
                "ip": request.client.host
            }
        )

    return response
