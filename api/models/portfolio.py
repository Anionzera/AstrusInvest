import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from . import Base


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("astrus.clients.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    strategy = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False, server_default=text("'draft'"))

    allocation = Column(JSONB, nullable=True)
    metrics = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"))
    updated_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"), onupdate=text("timezone('utc', now())"))

    client = relationship("Client", backref="portfolios")

    # schema herdado de Base


