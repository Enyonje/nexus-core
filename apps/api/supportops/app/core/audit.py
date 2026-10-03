from sqlmodel import Session
from app.models.audit_log import AuditLog

def log_event(
    session: Session,
    ticket_id: int,
    actor: str,
    action: str,
    details: str | None = None
):
    event = AuditLog(
        ticket_id=ticket_id,
        actor=actor,
        action=action,
        details=details
    )

    session.add(event)
    session.commit()
