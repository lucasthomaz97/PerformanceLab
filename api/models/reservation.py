import datetime
import enum
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.database import Base

if TYPE_CHECKING:
    from api.models.room import Room
    from api.models.user import User


class ReservationStatus(str, enum.Enum):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class Reservation(Base):
    __tablename__ = "reservations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False
    )
    room_id: Mapped[int] = mapped_column(
        ForeignKey("rooms.id"), nullable=False
    )
    check_in: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    check_out: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    status: Mapped[ReservationStatus] = mapped_column(
        Enum(ReservationStatus),
        default=ReservationStatus.CONFIRMED,
        nullable=False,
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        default=lambda: datetime.datetime.now(datetime.timezone.utc),
        onupdate=lambda: datetime.datetime.now(datetime.timezone.utc),
    )

    user: Mapped["User"] = relationship(
        "User", back_populates="reservations"
    )
    room: Mapped["Room"] = relationship(
        "Room", back_populates="reservations"
    )
