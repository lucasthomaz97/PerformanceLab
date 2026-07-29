from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from api.models.reservation import Reservation, ReservationStatus
from api.models.room import Room
from api.models.user import User
from api.schemas.reservation import ReservationCreate


class ReservationService:
    @staticmethod
    def create(db: Session, data: ReservationCreate) -> Reservation:
        user = db.query(User).filter(User.id == data.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="user not found",
            )

        room = (
            db.query(Room)
            .filter(Room.id == data.room_id, Room.is_active.is_(True))
            .first()
        )
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="room not found or unavailable",
            )

        overlap = (
            db.query(Reservation)
            .filter(
                Reservation.room_id == data.room_id,
                Reservation.status == ReservationStatus.CONFIRMED,
                Reservation.check_in < data.check_out,
                Reservation.check_out > data.check_in,
            )
            .first()
        )
        if overlap:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="room already reserved for the selected dates",
            )

        reservation = Reservation(
            user_id=data.user_id,
            room_id=data.room_id,
            check_in=data.check_in,
            check_out=data.check_out,
        )
        db.add(reservation)
        db.commit()
        db.refresh(reservation)
        return reservation

    @staticmethod
    def cancel(db: Session, reservation_id: int) -> Reservation:
        reservation = (
            db.query(Reservation)
            .filter(Reservation.id == reservation_id)
            .first()
        )
        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="reservation not found",
            )
        if reservation.status != ReservationStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"cannot cancel reservation with status '{reservation.status.value}'",
            )
        reservation.status = ReservationStatus.CANCELLED
        db.commit()
        db.refresh(reservation)
        return reservation

    @staticmethod
    def get_user_reservations(
        db: Session, user_id: int
    ) -> list[Reservation]:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="user not found",
            )
        return (
            db.query(Reservation)
            .filter(Reservation.user_id == user_id)
            .order_by(Reservation.check_in.desc())
            .all()
        )

    @staticmethod
    def get_room_reservations(
        db: Session, room_id: int
    ) -> list[Reservation]:
        room = (
            db.query(Room).filter(Room.id == room_id, Room.is_active.is_(True)).first()
        )
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="room not found or unavailable",
            )
        return (
            db.query(Reservation)
            .filter(Reservation.room_id == room_id)
            .order_by(Reservation.check_in.desc())
            .all()
        )
