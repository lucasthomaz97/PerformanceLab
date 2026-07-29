from collections.abc import Generator
from datetime import date, timedelta
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from api.database import Base
from api.models.reservation import Reservation, ReservationStatus  # noqa: F401
from api.models.room import Room  # noqa: F401
from api.models.user import User  # noqa: F401
from api.schemas.reservation import ReservationCreate
from api.schemas.room import RoomCreate
from api.schemas.user import UserCreate
from api.services.reservation_service import ReservationService
from api.services.room_service import RoomService
from api.services.user_service import UserService


@pytest.fixture
def engine():
    return create_engine("sqlite:///:memory:", echo=False)


@pytest.fixture
def db_session(engine) -> Generator[Session, None, None]:
    Base.metadata.create_all(bind=engine)
    session = Session(bind=engine, expire_on_commit=False)
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def user(db_session: Session) -> User:
    data = UserCreate(name="Alice", email="alice@test.com")
    return UserService.create(db_session, data)


@pytest.fixture
def second_user(db_session: Session) -> User:
    data = UserCreate(name="Bob", email="bob@test.com")
    return UserService.create(db_session, data)


@pytest.fixture
def room(db_session: Session) -> Room:
    data = RoomCreate(
        name="101", capacity=2, price_per_night=Decimal("150.00")
    )
    return RoomService.create(db_session, data)


@pytest.fixture
def second_room(db_session: Session) -> Room:
    data = RoomCreate(
        name="102", capacity=4, price_per_night=Decimal("250.00")
    )
    return RoomService.create(db_session, data)


@pytest.fixture
def reservation_data(user: User, room: Room) -> ReservationCreate:
    return ReservationCreate(
        user_id=user.id,
        room_id=room.id,
        check_in=date.today() + timedelta(days=1),
        check_out=date.today() + timedelta(days=4),
    )


@pytest.fixture
def reservation(
    db_session: Session, reservation_data: ReservationCreate
) -> Reservation:
    return ReservationService.create(db_session, reservation_data)
