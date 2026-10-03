from sqlmodel import SQLModel, Field
from datetime import datetime

# Database model
class User(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = {"extend_existing": True}  # ✅ prevents duplicate table definition errors

    id: int | None = Field(default=None, primary_key=True)

    email: str = Field(
        index=True,
        sa_column_kwargs={"unique": True, "nullable": False}
    )

    hashed_password: str = Field(
        sa_column_kwargs={"nullable": False}
    )

    role: str = Field(
        sa_column_kwargs={"nullable": False}
    )

    plan: str = Field(
        sa_column_kwargs={"nullable": False}
    )

    is_active: bool = Field(
        default=True,
        sa_column_kwargs={"nullable": False}
    )

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        sa_column_kwargs={"nullable": False}
    )


# ✅ Pydantic-style schemas for API use

# Input schema for creating a user
class UserCreate(SQLModel):
    email: str
    password: str   # plain password, will be hashed before saving
    role: str
    plan: str

# Input schema for updating a user
class UserUpdate(SQLModel):
    email: str | None = None
    password: str | None = None
    role: str | None = None
    plan: str | None = None
    is_active: bool | None = None

# Output schema for reading user data (safe: no password)
class UserRead(SQLModel):
    id: int
    email: str
    role: str
    plan: str
    is_active: bool
    created_at: datetime