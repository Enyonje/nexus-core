from sqlalchemy import Column, String, JSON
from app.database import Base
import uuid

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    domain = Column(String, unique=True, nullable=False)

    branding = Column(JSON, nullable=False, default={
        "logo": "",
        "primary_color": "#2563eb",
        "accent_color": "#0f172a",
        "company_name": "SupportOps"
    })
