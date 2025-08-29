import uuid
from flask import Blueprint, jsonify, request
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from db.session import get_session, get_engine
from models import Base, History, Client


history_bp = Blueprint("history", __name__, url_prefix="/api/history")


def _init_db():
    engine = get_engine()
    Base.metadata.create_all(bind=engine)




@history_bp.get("")
def list_history():
    try:
        client_id = request.args.get("client_id")
        with get_session() as session:
            if client_id:
                result = session.execute(select(History).where(History.client_id == uuid.UUID(client_id)))
            else:
                result = session.execute(select(History))
            items = []
            for (h,) in result.all():
                items.append({
                    "id": str(h.id),
                    "client_id": str(h.client_id),
                    "entity": h.entity,
                    "entity_id": str(h.entity_id),
                    "action": h.action,
                    "details": h.details,
                    "created_at": h.created_at.isoformat() if h.created_at else None,
                })
            return jsonify({"success": True, "data": items})
    except SQLAlchemyError as e:
        return jsonify({"success": False, "error": str(e)}), 500


@history_bp.post("")
def create_history():
    try:
        payload = request.get_json(force=True) or {}
        client_id = payload.get("client_id")
        if not client_id:
            return jsonify({"success": False, "error": "client_id is required"}), 400
        with get_session() as session:
            client = session.get(Client, uuid.UUID(client_id))
            if not client:
                return jsonify({"success": False, "error": "Client not found"}), 404
            h = History(
                client_id=client.id,
                entity=payload.get("entity", "unknown"),
                entity_id=uuid.UUID(payload.get("entity_id")) if payload.get("entity_id") else uuid.uuid4(),
                action=payload.get("action", "update"),
                details=payload.get("details"),
            )
            session.add(h)
            session.commit()
            return jsonify({"success": True, "id": str(h.id)})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@history_bp.get("/<history_id>")
def get_history(history_id: str):
    try:
        with get_session() as session:
            h = session.get(History, uuid.UUID(history_id))
            if not h:
                return jsonify({"success": False, "error": "Not found"}), 404
            data = {
                "id": str(h.id),
                "client_id": str(h.client_id),
                "entity": h.entity,
                "entity_id": str(h.entity_id),
                "action": h.action,
                "details": h.details,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            return jsonify({"success": True, "data": data})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@history_bp.delete("/<history_id>")
def delete_history(history_id: str):
    try:
        with get_session() as session:
            h = session.get(History, uuid.UUID(history_id))
            if not h:
                return jsonify({"success": False, "error": "Not found"}), 404
            session.delete(h)
            session.commit()
            return jsonify({"success": True})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


