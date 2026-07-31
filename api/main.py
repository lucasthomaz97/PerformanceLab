from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from api.database import Base, engine
from api.routers import reservations, rooms, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS btree_gist"))
            conn.execute(
                text(
                    "DO $$ BEGIN "
                    "IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'no_overlap') THEN "
                    "ALTER TABLE reservations "
                    "ADD CONSTRAINT no_overlap "
                    "EXCLUDE USING gist ("
                    "  room_id WITH =,"
                    "  daterange(check_in, check_out) WITH &&"
                    ") WHERE (status = 'confirmed'); "
                    "END IF; "
                    "END $$;"
                )
            )
    yield


app = FastAPI(title="PerformanceLab API", lifespan=lifespan)

app.include_router(users.router)
app.include_router(rooms.router)
app.include_router(reservations.router)
