import uuid
from flask import Blueprint, jsonify, request
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from db.session import get_session, get_engine
from models import Base, Portfolio, Client


portfolios_bp = Blueprint("portfolios", __name__, url_prefix="/api/portfolios")


def _init_db():
    engine = get_engine()
    Base.metadata.create_all(bind=engine)




@portfolios_bp.get("")
def list_portfolios():
    try:
        with get_session() as session:
            result = session.execute(select(Portfolio))
            items = []
            for (p,) in result.all():
                items.append({
                    "id": str(p.id),
                    "client_id": str(p.client_id),
                    "name": p.name,
                    "description": p.description,
                    "strategy": p.strategy,
                    "status": p.status,
                    "allocation": p.allocation,
                    "metrics": p.metrics,
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                    "updated_at": p.updated_at.isoformat() if p.updated_at else None,
                })
            return jsonify({"success": True, "data": items})
    except SQLAlchemyError as e:
        return jsonify({"success": False, "error": str(e)}), 500


@portfolios_bp.post("")
def create_portfolio():
    try:
        payload = request.get_json(force=True) or {}
        client_id = payload.get("client_id")
        if not client_id:
            return jsonify({"success": False, "error": "client_id is required"}), 400
        with get_session() as session:
            client = session.get(Client, uuid.UUID(client_id))
            if not client:
                return jsonify({"success": False, "error": "Client not found"}), 404
            p = Portfolio(
                client_id=client.id,
                name=payload.get("name", "Portfolio"),
                description=payload.get("description"),
                strategy=payload.get("strategy"),
                status=payload.get("status", "draft"),
                allocation=payload.get("allocation"),
                metrics=payload.get("metrics"),
            )
            session.add(p)
            session.commit()
            return jsonify({"success": True, "id": str(p.id)})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@portfolios_bp.get("/<portfolio_id>")
def get_portfolio(portfolio_id: str):
    try:
        with get_session() as session:
            p = session.get(Portfolio, uuid.UUID(portfolio_id))
            if not p:
                return jsonify({"success": False, "error": "Not found"}), 404
            data = {
                "id": str(p.id),
                "client_id": str(p.client_id),
                "name": p.name,
                "description": p.description,
                "strategy": p.strategy,
                "status": p.status,
                "allocation": p.allocation,
                "metrics": p.metrics,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "updated_at": p.updated_at.isoformat() if p.updated_at else None,
            }
            return jsonify({"success": True, "data": data})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@portfolios_bp.put("/<portfolio_id>")
def update_portfolio(portfolio_id: str):
    try:
        payload = request.get_json(force=True) or {}
        with get_session() as session:
            p = session.get(Portfolio, uuid.UUID(portfolio_id))
            if not p:
                return jsonify({"success": False, "error": "Not found"}), 404
            for field in ("name", "description", "strategy", "status", "allocation", "metrics"):
                if field in payload:
                    setattr(p, field, payload[field])
            session.add(p)
            session.commit()
            return jsonify({"success": True})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@portfolios_bp.delete("/<portfolio_id>")
def delete_portfolio(portfolio_id: str):
    try:
        with get_session() as session:
            p = session.get(Portfolio, uuid.UUID(portfolio_id))
            if not p:
                return jsonify({"success": False, "error": "Not found"}), 404
            session.delete(p)
            session.commit()
            return jsonify({"success": True})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


