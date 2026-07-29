from contextlib import asynccontextmanager

from fastapi import FastAPI

from api.database import Base, engine
from api.routers import reservations, rooms, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="PerformanceLab API", lifespan=lifespan)

app.include_router(users.router)
app.include_router(rooms.router)
app.include_router(reservations.router)
