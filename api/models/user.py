import uuid
from sqlalchemy import Column, String, DateTime, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from . import Base


class AppUser(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, server_default=text("'user'"))
    is_admin = Column(Boolean, nullable=False, server_default=text("false"))
    permissions = Column(String, nullable=True)  # CSV simples para MVP

    created_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"))
    updated_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"), onupdate=text("timezone('utc', now())"))


