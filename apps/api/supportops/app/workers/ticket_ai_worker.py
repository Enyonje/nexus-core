from sqlmodel import Session
from app.database import engine
from app.models.ticket import Ticket
from ai.analyzer import analyze_ticket

def run_ai_analysis(ticket_id: int):
    with Session(engine) as session:
        ticket = session.get(Ticket, ticket_id)
        if not ticket:
            return

        result = analyze_ticket(ticket.subject, ticket.summary)

        ticket.ai_category = result["category"]
        ticket.ai_suggestion = result["suggested_reply"]
        ticket.ai_confidence = result["confidence"]

        session.add(ticket)
        session.commit()
