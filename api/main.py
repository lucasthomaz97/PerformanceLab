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
                    "ALTER TABLE reservations "
                    "ADD CONSTRAINT IF NOT EXISTS no_overlap "
                    "EXCLUDE USING gist ("
                    "  room_id WITH =,"
                    "  daterange(check_in, check_out) WITH &&"
                    ") WHERE (status = 'confirmed')"
                )
            )
    yield


app = FastAPI(title="PerformanceLab API", lifespan=lifespan)

app.include_router(users.router)
app.include_router(rooms.router)
app.include_router(reservations.router)
