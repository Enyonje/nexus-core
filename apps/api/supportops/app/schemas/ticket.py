from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TicketBase(BaseModel):
    customer_email: str
    subject: str
    message: str
    ai_reply: Optional[str] = None
    ai_confidence: Optional[int] = None
    status: str = "open"

class TicketCreate(TicketBase):
    pass

class TicketRead(TicketBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True