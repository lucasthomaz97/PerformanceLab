from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from api.models.reservation import Reservation, ReservationStatus
from api.models.user import User
from api.schemas.user import UserCreate, UserUpdate


class UserService:
    @staticmethod
    def create(db: Session, data: UserCreate) -> User:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="email already registered",
            )
        user = User(name=data.name, email=data.email, phone=data.phone)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get(db: Session, user_id: int) -> User:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="user not found",
            )
        return user

    @staticmethod
    def get_multi(
        db: Session, skip: int = 0, limit: int = 100
    ) -> list[User]:
        return db.query(User).offset(skip).limit(limit).all()

    @staticmethod
    def update(db: Session, user_id: int, data: UserUpdate) -> User:
        user = UserService.get(db, user_id)
        update_data = data.model_dump(exclude_unset=True)
        if "email" in update_data:
            existing = (
                db.query(User)
                .filter(User.email == update_data["email"], User.id != user_id)
                .first()
            )
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="email already registered",
                )
        for field, value in update_data.items():
            setattr(user, field, value)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def delete(db: Session, user_id: int) -> None:
        user = UserService.get(db, user_id)
        active = (
            db.query(Reservation)
            .filter(
                Reservation.user_id == user_id,
                Reservation.status == ReservationStatus.CONFIRMED,
            )
            .first()
        )
        if active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="cannot delete user with active reservations",
            )
        db.delete(user)
        db.commit()
