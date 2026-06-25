"""Verifica que el backend use la DATABASE_URL activa y que responda la BD."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import text

from core.config import settings
from core.database import engine, verify_database_connection


def main() -> int:
    print(f"DATABASE host: {settings.database_host_label}")
    try:
        verify_database_connection()
        with engine.connect() as conn:
            analyzed = conn.execute(
                text("SELECT COUNT(*) FROM analyzed_posts")
            ).scalar()
            users = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
        print("OK: SELECT 1")
        print(f"OK: analyzed_posts={analyzed}, users={users}")
        return 0
    except Exception as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
