import uuid
from flask import Blueprint, jsonify, request
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from db.session import get_session, get_engine
from models import Base, Client


clients_bp = Blueprint("clients", __name__, url_prefix="/api/clients")


def _init_db():
    # Cria tabelas se não existirem
    engine = get_engine()
    Base.metadata.create_all(bind=engine)




@clients_bp.get("")
def list_clients():
    try:
        with get_session() as session:
            result = session.execute(select(Client))
            clients = [
                {
                    "id": str(c.id),
                    "name": c.name,
                    "email": c.email,
                    "phone": c.phone,
                    "company": c.company,
                    "risk_profile": c.risk_profile,
                    "notes": c.notes,
                    "active": c.active,
                    "created_at": c.created_at.isoformat() if c.created_at else None,
                    "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                }
                for (c,) in result.all()
            ]
            return jsonify({"success": True, "data": clients})
    except SQLAlchemyError as e:
        return jsonify({"success": False, "error": str(e)}), 500


@clients_bp.post("")
def create_client():
    try:
        payload = request.get_json(force=True) or {}
        with get_session() as session:
            client = Client(
                name=payload.get("name", ""),
                email=payload.get("email", ""),
                phone=payload.get("phone"),
                company=payload.get("company"),
                risk_profile=payload.get("risk_profile"),
                notes=payload.get("notes"),
                active=payload.get("active", True),
            )
            session.add(client)
            session.commit()
            return jsonify({"success": True, "id": str(client.id)})
    except SQLAlchemyError as e:
        return jsonify({"success": False, "error": str(e)}), 500


@clients_bp.get("/<client_id>")
def get_client(client_id: str):
    try:
        with get_session() as session:
            client = session.get(Client, uuid.UUID(client_id))
            if not client:
                return jsonify({"success": False, "error": "Not found"}), 404
            data = {
                "id": str(client.id),
                "name": client.name,
                "email": client.email,
                "phone": client.phone,
                "company": client.company,
                "risk_profile": client.risk_profile,
                "notes": client.notes,
                "active": client.active,
                "created_at": client.created_at.isoformat() if client.created_at else None,
                "updated_at": client.updated_at.isoformat() if client.updated_at else None,
            }
            return jsonify({"success": True, "data": data})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@clients_bp.put("/<client_id>")
def update_client(client_id: str):
    try:
        payload = request.get_json(force=True) or {}
        with get_session() as session:
            client = session.get(Client, uuid.UUID(client_id))
            if not client:
                return jsonify({"success": False, "error": "Not found"}), 404
            for field in ("name", "email", "phone", "company", "risk_profile", "notes", "active"):
                if field in payload:
                    setattr(client, field, payload[field])
            session.add(client)
            session.commit()
            return jsonify({"success": True})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@clients_bp.delete("/<client_id>")
def delete_client(client_id: str):
    try:
        with get_session() as session:
            client = session.get(Client, uuid.UUID(client_id))
            if not client:
                return jsonify({"success": False, "error": "Not found"}), 404
            session.delete(client)
            session.commit()
            return jsonify({"success": True})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


