import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Numeric, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from . import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(UUID(as_uuid=True), ForeignKey("astrus.clients.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    status = Column(String(50), nullable=False, server_default=text("'draft'"))

    risk_profile = Column(String(50), nullable=True)
    investment_horizon = Column(String(100), nullable=True)
    investment_amount = Column(Numeric(18, 2), nullable=True)

    content = Column(JSONB, nullable=True)
    allocation = Column(JSONB, nullable=True)  # normalized allocation object { class: percent }

    created_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"))
    updated_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"), onupdate=text("timezone('utc', now())"))

    client = relationship("Client", backref="recommendations")

    # schema herdado de Base (__table_args__), nenhum override aqui


