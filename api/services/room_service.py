import time
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import insert
from sqlalchemy.orm import Session

from api.models.reservation import Reservation, ReservationStatus
from api.models.room import Room
from api.schemas.room import RoomCreate, RoomUpdate


class RoomService:
    @staticmethod
    def create(db: Session, data: RoomCreate) -> Room:
        existing = db.query(Room).filter(Room.name == data.name).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="room name already exists",
            )
        room = Room(
            name=data.name,
            capacity=data.capacity,
            price_per_night=data.price_per_night,
            description=data.description,
        )
        db.add(room)
        db.commit()
        db.refresh(room)
        return room

    @staticmethod
    def get(db: Session, room_id: int) -> Room:
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="room not found",
            )
        return room

    @staticmethod
    def get_multi(
        db: Session, skip: int = 0, limit: int = 100, active_only: bool = True
    ) -> list[Room]:
        query = db.query(Room)
        if active_only:
            query = query.filter(Room.is_active.is_(True))
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def seed(db: Session, quantity: int) -> list[int]:
        run_id = time.time_ns()
        names = [f"Seed Room {run_id}-{i}" for i in range(quantity)]
        db.execute(
            insert(Room),
            [
                {
                    "name": names[i],
                    "capacity": 2,
                    "price_per_night": Decimal("99.99"),
                }
                for i in range(quantity)
            ],
        )
        db.commit()
        ids = (
            db.query(Room.id)
            .filter(Room.name.in_(names))
            .order_by(Room.id)
            .all()
        )
        return [row[0] for row in ids]

    @staticmethod
    def update(db: Session, room_id: int, data: RoomUpdate) -> Room:
        room = RoomService.get(db, room_id)
        update_data = data.model_dump(exclude_unset=True)
        if "name" in update_data:
            existing = (
                db.query(Room)
                .filter(Room.name == update_data["name"], Room.id != room_id)
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="room name already exists",
                )
        for field, value in update_data.items():
            setattr(room, field, value)
        db.commit()
        db.refresh(room)
        return room

    @staticmethod
    def delete(db: Session, room_id: int) -> None:
        room = RoomService.get(db, room_id)
        active = (
            db.query(Reservation)
            .filter(
                Reservation.room_id == room_id,
                Reservation.status == ReservationStatus.CONFIRMED,
            )
            .first()
        )
        if active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="cannot delete room with active reservations",
            )
        room.is_active = False
        db.commit()
        db.refresh(room)
