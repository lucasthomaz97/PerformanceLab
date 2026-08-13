import importlib

from fastapi.testclient import TestClient
from sqlalchemy import create_engine

import api.config
import api.main


def test_app_boots_and_serves(monkeypatch):
    monkeypatch.setattr(api.config, "ENABLE_LOADTEST_ENDPOINTS", False)
    main = importlib.reload(api.main)
    sqlite_engine = create_engine(
        "sqlite:///file::memory:?cache=shared&uri=true",
        echo=False,
        connect_args={"check_same_thread": False},
    )
    monkeypatch.setattr(main, "engine", sqlite_engine)
    try:
        with TestClient(main.app) as client:
            response = client.get("/openapi.json")
            assert response.status_code == 200
    finally:
        sqlite_engine.dispose()
