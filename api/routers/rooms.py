from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from api.database import get_db
from api.schemas.room import RoomCreate, RoomResponse, RoomUpdate
from api.services.room_service import RoomService

router = APIRouter(prefix="/rooms", tags=["rooms"])


@router.post("/", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(data: RoomCreate, db: Session = Depends(get_db)):
    return RoomService.create(db, data)


@router.get("/", response_model=list[RoomResponse])
def list_rooms(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    return RoomService.get_multi(db, skip=skip, limit=limit, active_only=active_only)


@router.get("/{room_id}", response_model=RoomResponse)
def get_room(room_id: int, db: Session = Depends(get_db)):
    return RoomService.get(db, room_id)


@router.put("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int, data: RoomUpdate, db: Session = Depends(get_db)
):
    return RoomService.update(db, room_id, data)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(room_id: int, db: Session = Depends(get_db)):
    RoomService.delete(db, room_id)
