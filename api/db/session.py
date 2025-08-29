import os
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker
import psycopg


POSTGRES_DEFAULTS = {
    "host": os.environ.get("PGHOST", "localhost"),
    "port": int(os.environ.get("PGPORT", "5432")),
    "user": os.environ.get("PGUSER", "postgres"),
    "password": os.environ.get("PGPASSWORD", "2598"),
    "dbname": os.environ.get("PGDATABASE", "astrus_db"),
    "schema": os.environ.get("PGSCHEMA", "astrus"),
}


_engine: Optional[Engine] = None
SessionLocal: Optional[sessionmaker] = None


def _ensure_database_exists() -> None:
    host = POSTGRES_DEFAULTS["host"]
    port = POSTGRES_DEFAULTS["port"]
    user = POSTGRES_DEFAULTS["user"]
    password = POSTGRES_DEFAULTS["password"]
    dbname = POSTGRES_DEFAULTS["dbname"]
    try:
        with psycopg.connect(host=host, port=port, user=user, password=password, dbname="postgres") as conn:
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (dbname,))
                exists = cur.fetchone() is not None
                if not exists:
                    cur.execute(f"CREATE DATABASE {dbname}")
    except Exception:
        # Se não for possível verificar/criar, seguir adiante e deixar erro aparecer no connect do SQLAlchemy
        pass


def _build_pg_dsn() -> str:
    user = POSTGRES_DEFAULTS["user"]
    pwd = POSTGRES_DEFAULTS["password"]
    host = POSTGRES_DEFAULTS["host"]
    port = POSTGRES_DEFAULTS["port"]
    dbname = POSTGRES_DEFAULTS["dbname"]
    return f"postgresql+psycopg://{user}:{pwd}@{host}:{port}/{dbname}"


def get_engine() -> Engine:
    global _engine, SessionLocal
    if _engine is None:
        _ensure_database_exists()
        dsn = _build_pg_dsn()
        _engine = create_engine(dsn, pool_pre_ping=True, future=True)

        # Garantir schema dedicado
        schema = POSTGRES_DEFAULTS["schema"]
        with _engine.connect() as conn:
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
            conn.commit()

        SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)

    return _engine


def get_session():
    if SessionLocal is None:
        get_engine()
    assert SessionLocal is not None
    return SessionLocal()


