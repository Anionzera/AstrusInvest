from sqlalchemy import Column, String, Date, Numeric, Boolean, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from . import Base


class Instrument(Base):
    __tablename__ = "fi_instruments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    kind = Column(String(16), nullable=False)  # CDB, LCI, LCA, CRI, CRA
    issuer = Column(String(120), nullable=False)
    indexer = Column(String(16), nullable=True)  # CDI, IPCA, SELIC, PRE
    rate = Column(Numeric(12, 8), nullable=True)  # taxa real ou multiplicador (ex.: 1.2 p/ CDI)
    daycount = Column(String(16), nullable=False, default="BUS/252")
    business_convention = Column(String(32), nullable=True)  # Following, ModFollowing
    ipca_lag_months = Column(Numeric(3, 0), nullable=True)  # defasagem IPCA
    face_value = Column(Numeric(18, 6), nullable=False)  # VNA/PU base
    issue_date = Column(Date, nullable=False)
    maturity_date = Column(Date, nullable=True)
    grace_days = Column(Numeric(6, 0), nullable=True)
    amortization = Column(String(16), nullable=False, default="BULLET")  # BULLET/PRICE/SAC
    schedule = Column(JSON, nullable=True)  # cashflows esperados (datas/percentuais)
    tax_regime = Column(String(8), nullable=True)  # PF/PJ


class PositionFI(Base):
    __tablename__ = "fi_positions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instrument_id = Column(UUID(as_uuid=True), ForeignKey("astrus.fi_instruments.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(UUID(as_uuid=True), ForeignKey("astrus.clients.id", ondelete="CASCADE"), nullable=False)
    trade_date = Column(Date, nullable=False)
    quantity = Column(Numeric(18, 8), nullable=False)
    price = Column(Numeric(18, 8), nullable=False)  # PU na data da compra

    instrument = relationship("Instrument")


class CashflowFI(Base):
    __tablename__ = "fi_cashflows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instrument_id = Column(UUID(as_uuid=True), ForeignKey("astrus.fi_instruments.id", ondelete="CASCADE"), nullable=False)
    flow_date = Column(Date, nullable=False)
    kind = Column(String(16), nullable=False)  # COUPON/AMORT/REDEMPTION/TAX
    amount = Column(Numeric(18, 8), nullable=False)


