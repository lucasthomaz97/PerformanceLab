import asyncio
import importlib

from sqlalchemy import create_engine

import api.config
import api.main


def _fresh_main(monkeypatch, enable_seed: bool):
    monkeypatch.setattr(api.config, "ENABLE_LOADTEST_ENDPOINTS", enable_seed)
    return importlib.reload(api.main)


def _route_paths(app) -> set[str]:
    return set(app.openapi()["paths"])


async def _exercise_lifespan(main):
    async with main.lifespan(main.app):
        pass


def test_app_includes_base_routers(monkeypatch):
    main = _fresh_main(monkeypatch, enable_seed=False)
    paths = _route_paths(main.app)
    assert "/users/" in paths
    assert "/rooms/" in paths
    assert "/reservations/" in paths


def test_seed_router_included_when_enabled(monkeypatch):
    main = _fresh_main(monkeypatch, enable_seed=True)
    paths = _route_paths(main.app)
    assert "/seed/users" in paths
    assert "/seed/rooms" in paths
    assert "/seed/reservations" in paths


def test_seed_router_excluded_when_disabled(monkeypatch):
    main = _fresh_main(monkeypatch, enable_seed=False)
    paths = _route_paths(main.app)
    assert not any(path.startswith("/seed") for path in paths)


def test_lifespan_creates_tables_on_non_postgres(monkeypatch):
    main = _fresh_main(monkeypatch, enable_seed=False)
    sqlite_engine = create_engine("sqlite:///:memory:", echo=False)
    monkeypatch.setattr(main, "engine", sqlite_engine)
    try:
        asyncio.run(_exercise_lifespan(main))
    finally:
        sqlite_engine.dispose()
    assert sqlite_engine.dialect.name == "sqlite"


class _FakeDialect:
    name = "postgresql"


class _FakeConnection:
    def __init__(self):
        self.executed = []

    def execute(self, statement):
        self.executed.append(statement.text)
        return self


class _FakeBegin:
    def __init__(self, connection):
        self._connection = connection

    def __enter__(self):
        return self._connection

    def __exit__(self, *exc_info):
        return False


class _FakeEngine:
    def __init__(self):
        self.dialect = _FakeDialect()
        self.connection = _FakeConnection()

    def begin(self):
        return _FakeBegin(self.connection)


def test_lifespan_runs_postgres_ddl(monkeypatch):
    main = _fresh_main(monkeypatch, enable_seed=False)
    fake_engine = _FakeEngine()
    monkeypatch.setattr(main, "engine", fake_engine)
    monkeypatch.setattr(main.Base.metadata, "create_all", lambda *a, **k: None)

    asyncio.run(_exercise_lifespan(main))

    statements = fake_engine.connection.executed
    assert len(statements) == 2
    assert statements[0] == "CREATE EXTENSION IF NOT EXISTS btree_gist"
    assert "EXCLUDE USING gist" in statements[1]
    assert "status = 'confirmed'" in statements[1]
