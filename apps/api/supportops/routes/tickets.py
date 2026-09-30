from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models.ticket import Ticket
from app.models.audit_log import AuditLog
from app.core.ai import generate_ai_reply
from app.core.email import send_email
from app.core.audit import log_event
from app.core.deps import get_current_user

router = APIRouter(prefix="/api/v1/tickets", tags=["Tickets"])

@router.post("/")
def create_ticket(
    ticket: Ticket,
    session: Session = Depends(get_session),
    user = Depends(get_current_user)
):
    session.add(ticket)
    session.commit()
    session.refresh(ticket)

    log_event(
        session,
        ticket_id=ticket.id,
        actor="USER",
        action="TICKET_CREATED",
        details=f"Subject: {ticket.subject}"
    )

    ai = generate_ai_reply(ticket.message)

    ticket.ai_reply = ai["reply"]
    ticket.ai_confidence = ai["confidence"]
    ticket.status = "auto-resolved" if ai["confidence"] > 70 else "pending"

    session.add(ticket)
    session.commit()

    log_event(
        session,
        ticket_id=ticket.id,
        actor="AI",
        action="AUTO_REPLY_GENERATED",
        details=f"Confidence {ticket.ai_confidence}%"
    )

    send_email(
        to=ticket.customer_email,
        subject=f"Re: {ticket.subject}",
        body=ticket.ai_reply
    )

    log_event(
        session,
        ticket_id=ticket.id,
        actor="SYSTEM",
        action="EMAIL_SENT",
        details=f"Sent to {ticket.customer_email}"
    )

    return ticket


@router.get("/{ticket_id}/timeline")
def get_ticket_timeline(
    ticket_id: int,
    session: Session = Depends(get_session),
    user = Depends(get_current_user)
):
    logs = session.exec(
        select(AuditLog)
        .where(AuditLog.ticket_id == ticket_id)
        .order_by(AuditLog.created_at)
    ).all()

    return logs
