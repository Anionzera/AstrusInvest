import uuid
from flask import Blueprint, jsonify, request
import re
try:
    import yfinance as yf  # type: ignore
except Exception:  # pragma: no cover
    yf = None
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from db.session import get_session, get_engine
from models import Base, Position, Portfolio


positions_bp = Blueprint("positions", __name__, url_prefix="/api/positions")
def _infer_asset_class(symbol: str) -> str:
    """Infer asset class from a ticker. Returns one of:
    'crypto', 'fx', 'commodity', 'etf_br', 'etf_us', 'fii_br', 'bdr_br', 'stock_br', 'stock_us'.
    Heuristic with optional Yahoo Finance metadata for better accuracy.
    """
    if not symbol:
        return "stock_us"
    s = (symbol or "").strip().upper()
    is_br = s.endswith(".SA")

    # Quick bucket by suffixes
    if s.endswith("=X"):
        return "fx"
    if s.endswith("=F") or re.search(r"=F$", s):
        return "commodity"
    if re.search(r"-(USD|BRL|EUR)$", s):
        return "crypto"

    # BR specific patterns
    if re.search(r"(34|35|39)\.SA$", s):
        return "bdr_br"
    if re.match(r"^[A-Z]{4}11\.SA$", s):
        # Could be ETF or FII; refine via metadata if possible
        class_if_etf = None
        if yf is not None:
            try:
                t = yf.Ticker(s)
                info = {}
                try:
                    info = t.get_info()  # yfinance >= 2
                except Exception:
                    info = getattr(t, 'info', {}) or {}
                qtype = str(info.get('quoteType') or '').upper()
                short_name = (info.get('shortName') or info.get('longName') or '')
                if 'ETF' in qtype or 'ETF' in short_name.upper():
                    class_if_etf = 'etf_br'
                elif 'FII' in short_name.upper() or 'IMOBILI' in short_name.upper():
                    return 'fii_br'
            except Exception:
                pass
        if class_if_etf:
            return class_if_etf
        # fallback: assume FII if 4 letters + 11.SA
        return 'fii_br'

    # Known ETFs
    known_etf_us = {
        "GLD","SPY","QQQ","IVV","VOO","VTI","IWM","DIA","EEM","EFA","VNQ","TLT","LQD","HYG",
        "XLK","XLF","XLE","XLV","XLY","XLP","XLI","XLB","XLU","ARKK"
    }
    known_etf_br = {
        "IVVB11.SA","BOVA11.SA","SMAL11.SA","SPXI11.SA","XFIX11.SA","DIVO11.SA","GOLD11.SA","BOVX11.SA",
        "NASD11.SA","EURP11.SA","ASIA11.SA","HASH11.SA"
    }
    if s in known_etf_us:
        return 'etf_us'
    if s in known_etf_br:
        return 'etf_br'

    # Metadata-based refinement
    if yf is not None:
        try:
            t = yf.Ticker(s)
            info = {}
            try:
                info = t.get_info()
            except Exception:
                info = getattr(t, 'info', {}) or {}
            qtype = str(info.get('quoteType') or '').upper()
            if qtype == 'ETF':
                return 'etf_br' if is_br else 'etf_us'
            if qtype == 'CRYPTOCURRENCY':
                return 'crypto'
        except Exception:
            pass

    # Fallbacks
    return 'stock_br' if is_br else 'stock_us'


def _init_db():
    engine = get_engine()
    Base.metadata.create_all(bind=engine)




@positions_bp.get("")
def list_positions():
    try:
        with get_session() as session:
            result = session.execute(select(Position))
            items = []
            for (pos,) in result.all():
                items.append({
                    "id": str(pos.id),
                    "portfolio_id": str(pos.portfolio_id),
                    "symbol": pos.symbol,
                    "asset_class": pos.asset_class,
                    "quantity": float(pos.quantity) if pos.quantity is not None else None,
                    "avg_price": float(pos.avg_price) if pos.avg_price is not None else None,
                    "purchase_date": pos.purchase_date.isoformat() if getattr(pos, "purchase_date", None) else None,
                    "created_at": pos.created_at.isoformat() if pos.created_at else None,
                    "updated_at": pos.updated_at.isoformat() if pos.updated_at else None,
                })
            return jsonify({"success": True, "data": items})
    except SQLAlchemyError as e:
        return jsonify({"success": False, "error": str(e)}), 500


@positions_bp.post("")
def create_position():
    try:
        payload = request.get_json(force=True) or {}
        portfolio_id = payload.get("portfolio_id")
        if not portfolio_id:
            return jsonify({"success": False, "error": "portfolio_id is required"}), 400
        with get_session() as session:
            portfolio = session.get(Portfolio, uuid.UUID(portfolio_id))
            if not portfolio:
                return jsonify({"success": False, "error": "Portfolio not found"}), 404
            symbol = payload.get("symbol")
            pos = Position(
                portfolio_id=portfolio.id,
                symbol=symbol,
                asset_class=payload.get("asset_class") or _infer_asset_class(symbol or ""),
                quantity=payload.get("quantity", 0),
                avg_price=payload.get("avg_price"),
                purchase_date=payload.get("purchase_date"),
            )
            session.add(pos)
            session.commit()
            return jsonify({"success": True, "id": str(pos.id)})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@positions_bp.get("/<position_id>")
def get_position(position_id: str):
    try:
        with get_session() as session:
            pos = session.get(Position, uuid.UUID(position_id))
            if not pos:
                return jsonify({"success": False, "error": "Not found"}), 404
            data = {
                "id": str(pos.id),
                "portfolio_id": str(pos.portfolio_id),
                "symbol": pos.symbol,
                "asset_class": pos.asset_class,
                "quantity": float(pos.quantity) if pos.quantity is not None else None,
                "avg_price": float(pos.avg_price) if pos.avg_price is not None else None,
                "purchase_date": pos.purchase_date.isoformat() if getattr(pos, "purchase_date", None) else None,
                "created_at": pos.created_at.isoformat() if pos.created_at else None,
                "updated_at": pos.updated_at.isoformat() if pos.updated_at else None,
            }
            return jsonify({"success": True, "data": data})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@positions_bp.put("/<position_id>")
def update_position(position_id: str):
    try:
        payload = request.get_json(force=True) or {}
        with get_session() as session:
            pos = session.get(Position, uuid.UUID(position_id))
            if not pos:
                return jsonify({"success": False, "error": "Not found"}), 404
            symbol_changed = False
            for field in ("symbol", "quantity", "avg_price", "purchase_date"):
                if field in payload:
                    setattr(pos, field, payload[field])
                    if field == "symbol":
                        symbol_changed = True
            # asset_class: infer automatically if not provided or if symbol changed
            if "asset_class" in payload and payload["asset_class"]:
                pos.asset_class = payload["asset_class"]
            elif symbol_changed:
                pos.asset_class = _infer_asset_class(getattr(pos, "symbol", "") or "")
            session.add(pos)
            session.commit()
            return jsonify({"success": True})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@positions_bp.delete("/<position_id>")
def delete_position(position_id: str):
    try:
        with get_session() as session:
            pos = session.get(Position, uuid.UUID(position_id))
            if not pos:
                return jsonify({"success": False, "error": "Not found"}), 404
            session.delete(pos)
            session.commit()
            return jsonify({"success": True})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


