from flask import Blueprint, jsonify
from sqlalchemy import text
from db.session import get_engine


health_bp = Blueprint("health", __name__, url_prefix="/api/health")


@health_bp.get("")
def health_check():
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return jsonify({"ok": True, "db": True})
    except Exception as e:
        return jsonify({"ok": False, "db": False, "error": str(e)}), 500


