import uuid
from sqlalchemy import Column, String, DateTime, Boolean, text
from sqlalchemy.dialects.postgresql import UUID
from . import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True)
    phone = Column(String(50), nullable=True)
    company = Column(String(255), nullable=True)
    risk_profile = Column(String(50), nullable=True)
    notes = Column(String, nullable=True)
    active = Column(Boolean, nullable=False, server_default=text("true"))

    created_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"))
    updated_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"), onupdate=text("timezone('utc', now())"))

    # schema herdado de Base


