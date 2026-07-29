from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError

from api.models.reservation import Reservation, ReservationStatus
from api.models.room import Room
from api.models.user import User


class TestReservationStatus:
    def test_enum_values(self):
        assert ReservationStatus.CONFIRMED.value == "confirmed"
        assert ReservationStatus.CANCELLED.value == "cancelled"
        assert ReservationStatus.COMPLETED.value == "completed"

    def test_is_str_enum(self):
        assert issubclass(ReservationStatus, str)

    def test_all_members_covered(self):
        assert set(ReservationStatus.__members__) == {
            "CONFIRMED", "CANCELLED", "COMPLETED"
        }


class TestRoomDefaults:
    def test_is_active_defaults_to_true(self, db_session):
        room = Room(
            name="Test", capacity=2, price_per_night=Decimal("100")
        )
        db_session.add(room)
        db_session.flush()
        assert room.is_active is True


class TestReservationDefaults:
    def test_status_defaults_to_confirmed(self, db_session, user, room):
        reservation = Reservation(
            user_id=user.id,
            room_id=room.id,
            check_in=date(2026, 8, 1),
            check_out=date(2026, 8, 5),
        )
        db_session.add(reservation)
        db_session.flush()
        assert reservation.status == ReservationStatus.CONFIRMED


class TestUserUniqueEmail:
    def test_duplicate_email_raises(self, db_session):
        user1 = User(name="Alice", email="same@test.com")
        db_session.add(user1)
        db_session.commit()

        user2 = User(name="Bob", email="same@test.com")
        db_session.add(user2)
        with pytest.raises(IntegrityError):
            db_session.commit()
        db_session.rollback()


class TestRoomUniqueName:
    def test_duplicate_name_raises(self, db_session):
        room1 = Room(
            name="101", capacity=2, price_per_night=Decimal("100")
        )
        db_session.add(room1)
        db_session.commit()

        room2 = Room(
            name="101", capacity=2, price_per_night=Decimal("100")
        )
        db_session.add(room2)
        with pytest.raises(IntegrityError):
            db_session.commit()
        db_session.rollback()


class TestUserCascadeDelete:
    def test_delete_user_cascades_to_reservations(self, db_session, room):
        user = User(name="Alice", email="alice@test.com")
        db_session.add(user)
        db_session.flush()

        reservation = Reservation(
            user_id=user.id,
            room_id=room.id,
            check_in=date(2026, 8, 1),
            check_out=date(2026, 8, 5),
        )
        user.reservations.append(reservation)
        db_session.commit()

        db_session.delete(user)
        db_session.commit()

        remaining = db_session.query(Reservation).all()
        assert len(remaining) == 0


class TestRoomCascadeDelete:
    def test_delete_room_cascades_to_reservations(self, db_session, user):
        room = Room(
            name="101", capacity=2, price_per_night=Decimal("150")
        )
        db_session.add(room)
        db_session.flush()

        reservation = Reservation(
            user_id=user.id,
            room_id=room.id,
            check_in=date(2026, 8, 1),
            check_out=date(2026, 8, 5),
        )
        room.reservations.append(reservation)
        db_session.commit()

        db_session.delete(room)
        db_session.commit()

        remaining = db_session.query(Reservation).all()
        assert len(remaining) == 0
