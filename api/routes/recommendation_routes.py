import uuid
from flask import Blueprint, jsonify, request
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError

from db.session import get_session, get_engine
from models import Base, Recommendation, Client


recommendations_bp = Blueprint("recommendations", __name__, url_prefix="/api/recommendations")


def _init_db():
    engine = get_engine()
    Base.metadata.create_all(bind=engine)


def _ensure_allocation_column():
    """Garantir que a coluna allocation exista (migração leve sem Alembic)."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE astrus.recommendations ADD COLUMN IF NOT EXISTS allocation JSONB"))
            conn.commit()
    except Exception:
        # Evitar derrubar a rota em caso de erro de permissão; logs podem ser adicionados se necessário
        pass




@recommendations_bp.get("")
def list_recommendations():
    try:
        _ensure_allocation_column()
        with get_session() as session:
            result = session.execute(select(Recommendation))
            items = []
            for (rec,) in result.all():
                items.append({
                    "id": str(rec.id),
                    "client_id": str(rec.client_id),
                    "title": rec.title,
                    "description": rec.description,
                    "status": rec.status,
                    "risk_profile": rec.risk_profile,
                    "investment_horizon": rec.investment_horizon,
                    "investment_amount": float(rec.investment_amount) if rec.investment_amount is not None else None,
                    "content": rec.content,
                    "allocation": rec.allocation,
                    "created_at": rec.created_at.isoformat() if rec.created_at else None,
                    "updated_at": rec.updated_at.isoformat() if rec.updated_at else None,
                })
            return jsonify({"success": True, "data": items})
    except SQLAlchemyError as e:
        return jsonify({"success": False, "error": str(e)}), 500


@recommendations_bp.post("")
def create_recommendation():
    try:
        _ensure_allocation_column()
        payload = request.get_json(force=True) or {}
        client_id = payload.get("client_id")
        if not client_id:
            return jsonify({"success": False, "error": "client_id is required"}), 400
        with get_session() as session:
            client = session.get(Client, uuid.UUID(client_id))
            if not client:
                return jsonify({"success": False, "error": "Client not found"}), 404
            # Normalizar allocation (se vier em content ou como campo dedicado)
            allocation = payload.get("allocation")
            if not allocation:
                content = payload.get("content") or {}
                # Tentar extrair allocation de várias formas
                if isinstance(content.get("allocationData"), dict):
                    allocation = content.get("allocationData")
                elif isinstance(content.get("alocacaoRecomendada"), dict):
                    allocation = content.get("alocacaoRecomendada")
                elif isinstance(content.get("allocation"), dict):
                    allocation = content.get("allocation")

            rec = Recommendation(
                client_id=client.id,
                title=payload.get("title", "Recommendation"),
                description=payload.get("description"),
                status=payload.get("status", "draft"),
                risk_profile=payload.get("risk_profile"),
                investment_horizon=payload.get("investment_horizon"),
                investment_amount=payload.get("investment_amount"),
                content=payload.get("content"),
                allocation=allocation,
            )
            session.add(rec)
            session.commit()
            return jsonify({"success": True, "id": str(rec.id)})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@recommendations_bp.get("/<rec_id>")
def get_recommendation(rec_id: str):
    try:
        _ensure_allocation_column()
        with get_session() as session:
            rec = session.get(Recommendation, uuid.UUID(rec_id))
            if not rec:
                return jsonify({"success": False, "error": "Not found"}), 404
            data = {
                "id": str(rec.id),
                "client_id": str(rec.client_id),
                "title": rec.title,
                "description": rec.description,
                "status": rec.status,
                "risk_profile": rec.risk_profile,
                "investment_horizon": rec.investment_horizon,
                "investment_amount": float(rec.investment_amount) if rec.investment_amount is not None else None,
                "content": rec.content,
                "allocation": rec.allocation,
                "created_at": rec.created_at.isoformat() if rec.created_at else None,
                "updated_at": rec.updated_at.isoformat() if rec.updated_at else None,
            }
            return jsonify({"success": True, "data": data})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@recommendations_bp.put("/<rec_id>")
def update_recommendation(rec_id: str):
    try:
        _ensure_allocation_column()
        payload = request.get_json(force=True) or {}
        with get_session() as session:
            rec = session.get(Recommendation, uuid.UUID(rec_id))
            if not rec:
                return jsonify({"success": False, "error": "Not found"}), 404
            for field in ("title", "description", "status", "risk_profile", "investment_horizon", "investment_amount", "content", "allocation"):
                if field in payload:
                    setattr(rec, field, payload[field])
            session.add(rec)
            session.commit()
            return jsonify({"success": True})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@recommendations_bp.delete("/<rec_id>")
def delete_recommendation(rec_id: str):
    try:
        with get_session() as session:
            rec = session.get(Recommendation, uuid.UUID(rec_id))
            if not rec:
                return jsonify({"success": False, "error": "Not found"}), 404
            session.delete(rec)
            session.commit()
            return jsonify({"success": True})
    except (SQLAlchemyError, ValueError) as e:
        return jsonify({"success": False, "error": str(e)}), 500


@recommendations_bp.post("/backfill-allocation")
def backfill_allocation():
    """Preenche a coluna allocation com base em content.* para linhas antigas.
    Idempotente. Retorna quantidade de linhas afetadas.
    """
    try:
        _ensure_allocation_column()
        upd_sql = text(
            """
            UPDATE astrus.recommendations
            SET allocation = COALESCE(
                content -> 'allocationData',
                content -> 'alocacaoRecomendada',
                content -> 'allocation'
            )
            WHERE allocation IS NULL
            """
        )
        with get_session() as session:
            res = session.execute(upd_sql)
            session.commit()
            try:
                affected = res.rowcount
            except Exception:
                affected = None
        return jsonify({"success": True, "updated": affected})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


