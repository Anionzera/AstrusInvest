import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from . import Base


class History(Base):
    __tablename__ = "history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("astrus.clients.id", ondelete="CASCADE"), nullable=False)
    entity = Column(String(100), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(50), nullable=False)
    details = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"))

    # schema herdado de Base


