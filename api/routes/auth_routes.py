import uuid
import hashlib
import hmac
import os
import json
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
import jwt
from sqlalchemy import select

from db.session import get_session, get_engine
from models import Base
from models.user import AppUser


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

JWT_SECRET = os.environ.get("JWT_SECRET", "astrus_dev_secret")
JWT_ALG = "HS256"
JWT_EXP_MINUTES = int(os.environ.get("JWT_EXP_MINUTES", "60"))


def _hash_password(password: str) -> str:
    salt = os.environ.get("PWD_SALT", "astrus")
    return hmac.new(salt.encode(), password.encode(), hashlib.sha256).hexdigest()


def _issue_tokens(user: AppUser):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role,
        "isAdmin": bool(user.is_admin),
        "permissions": (user.permissions or "").split(",") if user.permissions else [],
        "exp": int((now + timedelta(minutes=JWT_EXP_MINUTES)).timestamp()),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    refresh = jwt.encode({"sub": str(user.id), "exp": int((now + timedelta(days=1)).timestamp())}, JWT_SECRET, algorithm=JWT_ALG)
    return token, refresh


@auth_bp.post("/register")
def register():
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    name = (data.get("name") or username).strip()
    email = (data.get("email") or "").strip()
    if not username or not password:
        return jsonify({"success": False, "error": "username and password are required"}), 400
    with get_session() as session:
        exists = session.execute(select(AppUser).where(AppUser.username == username)).scalar_one_or_none()
        if exists:
            return jsonify({"success": False, "error": "username already exists"}), 400
        user = AppUser(username=username, password_hash=_hash_password(password), name=name, email=email)
        session.add(user)
        session.commit()
        return jsonify({"success": True, "id": str(user.id)})


@auth_bp.post("/login")
def login():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"success": False, "error": "invalid credentials"}), 400
    with get_session() as session:
        user = session.execute(select(AppUser).where(AppUser.username == username)).scalar_one_or_none()
        if not user or user.password_hash != _hash_password(password):
            return jsonify({"success": False, "error": "invalid credentials"}), 401
        token, refresh = _issue_tokens(user)
        return jsonify({
            "success": True,
            "token": token,
            "refreshToken": refresh,
            "user": {
                "id": str(user.id),
                "username": user.username,
                "role": user.role,
                "name": user.name,
                "email": user.email,
                "isAdmin": bool(user.is_admin),
                "hasAdminAccess": bool(user.is_admin),
                "hasRealAdminAccess": bool(user.is_admin),
                "permissions": (user.permissions or "").split(",") if user.permissions else [],
                "loginTime": datetime.now(timezone.utc).isoformat(),
                "lastActivity": datetime.now(timezone.utc).isoformat(),
            }
        })


@auth_bp.post("/refresh")
def refresh():
    data = request.get_json(force=True) or {}
    refresh_token = data.get("refreshToken")
    if not refresh_token:
        return jsonify({"success": False, "error": "refresh token required"}), 400
    try:
        decoded = jwt.decode(refresh_token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = decoded.get("sub")
    except Exception as e:
        return jsonify({"success": False, "error": "invalid refresh token"}), 401
    with get_session() as session:
        user = session.get(AppUser, uuid.UUID(user_id))
        if not user:
            return jsonify({"success": False, "error": "user not found"}), 404
        token, new_refresh = _issue_tokens(user)
        return jsonify({"success": True, "token": token, "refreshToken": new_refresh})


