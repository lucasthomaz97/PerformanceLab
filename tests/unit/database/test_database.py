from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from api.database import get_db


def test_get_db_yields_a_session():
    sessions = list(get_db())
    assert len(sessions) == 1
    assert isinstance(sessions[0], Session)


def test_get_db_as_fastapi_dependency():
    app = FastAPI()

    @app.get("/")
    def root(db: Session = Depends(get_db)):
        return {"has_session": db is not None}

    client = TestClient(app)
    assert client.get("/").json() == {"has_session": True}
