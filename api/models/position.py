import uuid
from sqlalchemy import Column, String, DateTime, Date, ForeignKey, Numeric, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from . import Base


class Position(Base):
    __tablename__ = "positions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id = Column(UUID(as_uuid=True), ForeignKey("astrus.portfolios.id", ondelete="CASCADE"), nullable=False)

    symbol = Column(String(50), nullable=False)
    asset_class = Column(String(50), nullable=True)
    quantity = Column(Numeric(24, 8), nullable=False, server_default=text("0"))
    avg_price = Column(Numeric(18, 6), nullable=True)
    purchase_date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"))
    updated_at = Column(DateTime(timezone=True), server_default=text("timezone('utc', now())"), onupdate=text("timezone('utc', now())"))

    portfolio = relationship("Portfolio", backref="positions")

    # schema herdado de Base


