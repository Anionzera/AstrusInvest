from sqlalchemy import text

from db.session import get_engine, POSTGRES_DEFAULTS


def ensure_users_table() -> None:
    engine = get_engine()
    schema = POSTGRES_DEFAULTS["schema"]

    ddl_statements = [
        f"CREATE SCHEMA IF NOT EXISTS {schema}",
        f"CREATE TABLE IF NOT EXISTS {schema}.users (id UUID PRIMARY KEY)",
        f"ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS username VARCHAR(150)",
        f"ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
        f"ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS name VARCHAR(255)",
        f"ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
        f"ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'",
        f"ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE",
        f"ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS permissions TEXT",
        f"ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc', now())",
        f"ALTER TABLE {schema}.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())",
        f"CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON {schema}.users(username)",
    ]

    with engine.begin() as conn:
        for stmt in ddl_statements:
            conn.execute(text(stmt))


def debug_list_columns() -> None:
    engine = get_engine()
    schema = POSTGRES_DEFAULTS["schema"]
    with engine.connect() as conn:
        res = conn.execute(
            text(
                """
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = :schema AND table_name = 'users'
                ORDER BY ordinal_position
                """
            ),
            {"schema": schema},
        )
        cols = list(res.fetchall())
        print("users columns:")
        for c in cols:
            print(" -", c[0], c[1])


if __name__ == "__main__":
    ensure_users_table()
    debug_list_columns()
    print("users table ensured")


