from sqlalchemy import Column, String, DateTime, JSON
from datetime import datetime
import uuid
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    tenant_id = Column(String, nullable=False)

    actor_type = Column(String, nullable=False)  # user | ai | system
    actor_id = Column(String, nullable=True)

    action = Column(String, nullable=False)
    resource = Column(String, nullable=False)

    # ❌ "metadata" is reserved in SQLAlchemy
    # ✅ renamed to event_metadata
    event_metadata = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)