from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from api.database import get_db
from api.schemas.reservation import (
    ReservationCreate,
    ReservationResponse,
)
from api.services.reservation_service import ReservationService

router = APIRouter(prefix="/reservations", tags=["reservations"])


@router.post(
    "/", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED
)
def create_reservation(data: ReservationCreate, db: Session = Depends(get_db)):
    return ReservationService.create(db, data)


@router.patch("/{reservation_id}/cancel", response_model=ReservationResponse)
def cancel_reservation(reservation_id: int, db: Session = Depends(get_db)):
    return ReservationService.cancel(db, reservation_id)


@router.get("/user/{user_id}", response_model=list[ReservationResponse])
def list_user_reservations(user_id: int, db: Session = Depends(get_db)):
    return ReservationService.get_user_reservations(db, user_id)


@router.get("/room/{room_id}", response_model=list[ReservationResponse])
def list_room_reservations(room_id: int, db: Session = Depends(get_db)):
    return ReservationService.get_room_reservations(db, room_id)
