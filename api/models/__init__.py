import os
from sqlalchemy.orm import DeclarativeBase, declared_attr
from sqlalchemy import MetaData


convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=convention)

    @declared_attr.directive
    def __table_args__(cls):  # type: ignore
        return {"schema": os.environ.get("PGSCHEMA", "astrus")}


from .client import Client  # noqa: F401
from .recommendation import Recommendation  # noqa: F401
from .portfolio import Portfolio  # noqa: F401
from .position import Position  # noqa: F401
from .history import History  # noqa: F401
from .user import AppUser  # noqa: F401
from .fixed_income import Instrument, PositionFI, CashflowFI  # noqa: F401

__all__ = [
    "Base",
    "Client",
    "Recommendation",
    "Portfolio",
    "Position",
    "History",
    "AppUser",
    "Instrument",
    "PositionFI",
    "CashflowFI",
]

