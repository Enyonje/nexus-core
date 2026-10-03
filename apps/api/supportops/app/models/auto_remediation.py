from sqlalchemy import Column, String, Boolean, Float, Text
from app.database import Base
import uuid

class AutoRemediationRule(Base):
    __tablename__ = "auto_remediation_rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    trigger_keyword = Column(String, nullable=False)
    remediation_action = Column(Text, nullable=False)

    confidence_score = Column(Float, default=0.0)
    auto_apply = Column(Boolean, default=False)
