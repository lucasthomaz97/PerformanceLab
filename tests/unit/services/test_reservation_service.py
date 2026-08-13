from datetime import date, timedelta
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from freezegun import freeze_time
from sqlalchemy.exc import IntegrityError

from api.models.reservation import Reservation, ReservationStatus
from api.models.room import Room
from api.models.user import User
from api.schemas.reservation import ReservationCreate
from api.services.reservation_service import ReservationService
from api.services.room_service import RoomService
from tests.unit.conftest import FROZEN_DATE


class TestCreateReservation:
    @freeze_time(FROZEN_DATE)
    def test_create_reservation_success(self, db_session, user, room):
        data = ReservationCreate(
            user_id=user.id,
            room_id=room.id,
            check_in=date(2026, 8, 1),
            check_out=date(2026, 8, 4),
        )
        result = ReservationService.create(db_session, data)
        assert result.id is not None
        assert result.user_id == user.id
        assert result.room_id == room.id
        assert result.check_in == date(2026, 8, 1)
        assert result.check_out == date(2026, 8, 4)
        assert result.status == ReservationStatus.CONFIRMED

    @freeze_time(FROZEN_DATE)
    def test_create_reservation_user_not_found(self, db_session, room):
        data = ReservationCreate(
            user_id=999,
            room_id=room.id,
            check_in=date(2026, 8, 1),
            check_out=date(2026, 8, 4),
        )
        with pytest.raises(HTTPException) as exc:
            ReservationService.create(db_session, data)
        assert exc.value.status_code == 404
        assert exc.value.detail == "user not found"

    @freeze_time(FROZEN_DATE)
    def test_create_reservation_room_not_found(self, db_session, user):
        data = ReservationCreate(
            user_id=user.id,
            room_id=999,
            check_in=date(2026, 8, 1),
            check_out=date(2026, 8, 4),
        )
        with pytest.raises(HTTPException) as exc:
            ReservationService.create(db_session, data)
        assert exc.value.status_code == 404
        assert exc.value.detail == "room not found or unavailable"

    @freeze_time(FROZEN_DATE)
    def test_create_reservation_room_inactive(self, db_session, user, room):
        RoomService.delete(db_session, room.id)
        data = ReservationCreate(
            user_id=user.id,
            room_id=room.id,
            check_in=date(2026, 8, 1),
            check_out=date(2026, 8, 4),
        )
        with pytest.raises(HTTPException) as exc:
            ReservationService.create(db_session, data)
        assert exc.value.status_code == 404
        assert exc.value.detail == "room not found or unavailable"

    @freeze_time(FROZEN_DATE)
    def test_create_overlap_inside(self, db_session, user, room):
        ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=room.id,
                check_in=date(2026, 8, 1),
                check_out=date(2026, 8, 10),
            ),
        )
        with pytest.raises(HTTPException) as exc:
            ReservationService.create(
                db_session,
                ReservationCreate(
                    user_id=user.id,
                    room_id=room.id,
                    check_in=date(2026, 8, 3),
                    check_out=date(2026, 8, 7),
                ),
            )
        assert exc.value.status_code == 409
        assert "already reserved" in exc.value.detail

    @freeze_time(FROZEN_DATE)
    def test_create_overlap_start_before(self, db_session, user, room):
        ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=room.id,
                check_in=date(2026, 8, 5),
                check_out=date(2026, 8, 10),
            ),
        )
        with pytest.raises(HTTPException) as exc:
            ReservationService.create(
                db_session,
                ReservationCreate(
                    user_id=user.id,
                    room_id=room.id,
                    check_in=date(2026, 8, 1),
                    check_out=date(2026, 8, 7),
                ),
            )
        assert exc.value.status_code == 409
        assert exc.value.detail == "room already reserved for the selected dates"

    @freeze_time(FROZEN_DATE)
    def test_create_overlap_ends_after(self, db_session, user, room):
        ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=room.id,
                check_in=date(2026, 8, 1),
                check_out=date(2026, 8, 5),
            ),
        )
        with pytest.raises(HTTPException) as exc:
            ReservationService.create(
                db_session,
                ReservationCreate(
                    user_id=user.id,
                    room_id=room.id,
                    check_in=date(2026, 8, 3),
                    check_out=date(2026, 8, 10),
                ),
            )
        assert exc.value.status_code == 409
        assert exc.value.detail == "room already reserved for the selected dates"

    @freeze_time(FROZEN_DATE)
    def test_create_overlap_contains(self, db_session, user, room):
        ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=room.id,
                check_in=date(2026, 8, 3),
                check_out=date(2026, 8, 7),
            ),
        )
        with pytest.raises(HTTPException) as exc:
            ReservationService.create(
                db_session,
                ReservationCreate(
                    user_id=user.id,
                    room_id=room.id,
                    check_in=date(2026, 8, 1),
                    check_out=date(2026, 8, 10),
                ),
            )
        assert exc.value.status_code == 409
        assert exc.value.detail == "room already reserved for the selected dates"

    @freeze_time(FROZEN_DATE)
    def test_create_no_overlap_adjacent(self, db_session, user, room):
        ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=room.id,
                check_in=date(2026, 8, 1),
                check_out=date(2026, 8, 5),
            ),
        )
        result = ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=room.id,
                check_in=date(2026, 8, 5),
                check_out=date(2026, 8, 10),
            ),
        )
        assert result.id is not None
        assert result.status == ReservationStatus.CONFIRMED

    @freeze_time(FROZEN_DATE)
    def test_create_no_overlap_separate(self, db_session, user, room):
        ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=room.id,
                check_in=date(2026, 8, 1),
                check_out=date(2026, 8, 5),
            ),
        )
        result = ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=room.id,
                check_in=date(2026, 8, 10),
                check_out=date(2026, 8, 15),
            ),
        )
        assert result.user_id == user.id
        assert result.room_id == room.id
        assert result.check_in == date(2026, 8, 10)
        assert result.check_out == date(2026, 8, 15)
        assert result.status == ReservationStatus.CONFIRMED

    @freeze_time(FROZEN_DATE)
    def test_create_different_rooms_no_conflict(
        self, db_session, user, room, second_room
    ):
        ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=room.id,
                check_in=date(2026, 8, 1),
                check_out=date(2026, 8, 10),
            ),
        )
        result = ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=second_room.id,
                check_in=date(2026, 8, 1),
                check_out=date(2026, 8, 10),
            ),
        )
        assert result.user_id == user.id
        assert result.room_id == second_room.id
        assert result.check_in == date(2026, 8, 1)
        assert result.check_out == date(2026, 8, 10)
        assert result.status == ReservationStatus.CONFIRMED

    @freeze_time(FROZEN_DATE)
    def test_create_reservation_db_constraint_race(self, db_session, user, room):
        data = ReservationCreate(
            user_id=user.id,
            room_id=room.id,
            check_in=date(2026, 8, 1),
            check_out=date(2026, 8, 5),
        )
        error = IntegrityError(
            "INSERT INTO reservations ...",
            {},
            Exception("duplicate key value violates unique constraint"),
        )
        with patch.object(db_session, "commit", side_effect=error):
            with pytest.raises(HTTPException) as exc:
                ReservationService.create(db_session, data)
        assert exc.value.status_code == 409
        assert exc.value.detail == "room already reserved for the selected dates"


class TestCancelReservation:
    @freeze_time(FROZEN_DATE)
    def test_cancel_confirmed_reservation(self, db_session, reservation):
        result = ReservationService.cancel(db_session, reservation.id)
        assert result.status == ReservationStatus.CANCELLED

    @freeze_time(FROZEN_DATE)
    def test_cancel_already_cancelled(self, db_session, reservation):
        ReservationService.cancel(db_session, reservation.id)
        with pytest.raises(HTTPException) as exc:
            ReservationService.cancel(db_session, reservation.id)
        assert exc.value.status_code == 400
        assert "cancelled" in exc.value.detail

    @freeze_time(FROZEN_DATE)
    def test_cancel_completed(self, db_session, reservation):
        reservation.status = ReservationStatus.COMPLETED
        db_session.commit()
        with pytest.raises(HTTPException) as exc:
            ReservationService.cancel(db_session, reservation.id)
        assert exc.value.status_code == 400
        assert "completed" in exc.value.detail

    @freeze_time(FROZEN_DATE)
    def test_cancel_not_found(self, db_session):
        with pytest.raises(HTTPException) as exc:
            ReservationService.cancel(db_session, 999)
        assert exc.value.status_code == 404
        assert exc.value.detail == "reservation not found"


class TestListUserReservations:
    @freeze_time(FROZEN_DATE)
    def test_list_user_reservations(self, db_session, user, room, second_room):
        r1 = ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=room.id,
                check_in=date(2026, 8, 1),
                check_out=date(2026, 8, 5),
            ),
        )
        r2 = ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=second_room.id,
                check_in=date(2026, 9, 1),
                check_out=date(2026, 9, 5),
            ),
        )
        result = ReservationService.get_user_reservations(db_session, user.id)
        assert len(result) == 2
        assert {r.id for r in result} == {r1.id, r2.id}
        assert all(r.user_id == user.id for r in result)

    @freeze_time(FROZEN_DATE)
    def test_list_user_reservations_empty(self, db_session, user):
        result = ReservationService.get_user_reservations(db_session, user.id)
        assert result == []

    @freeze_time(FROZEN_DATE)
    def test_list_user_reservations_user_not_found(self, db_session):
        with pytest.raises(HTTPException) as exc:
            ReservationService.get_user_reservations(db_session, 999)
        assert exc.value.status_code == 404
        assert exc.value.detail == "user not found"


class TestListRoomReservations:
    @freeze_time(FROZEN_DATE)
    def test_list_room_reservations(self, db_session, user, room, second_user):
        r1 = ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=user.id,
                room_id=room.id,
                check_in=date(2026, 8, 1),
                check_out=date(2026, 8, 5),
            ),
        )
        r2 = ReservationService.create(
            db_session,
            ReservationCreate(
                user_id=second_user.id,
                room_id=room.id,
                check_in=date(2026, 9, 1),
                check_out=date(2026, 9, 5),
            ),
        )
        result = ReservationService.get_room_reservations(db_session, room.id)
        assert len(result) == 2
        assert {r.id for r in result} == {r1.id, r2.id}
        assert all(r.room_id == room.id for r in result)

    @freeze_time(FROZEN_DATE)
    def test_list_room_reservations_empty(self, db_session, room):
        result = ReservationService.get_room_reservations(db_session, room.id)
        assert result == []

    @freeze_time(FROZEN_DATE)
    def test_list_room_reservations_room_inactive(self, db_session, room):
        RoomService.delete(db_session, room.id)
        with pytest.raises(HTTPException) as exc:
            ReservationService.get_room_reservations(db_session, room.id)
        assert exc.value.status_code == 404
        assert exc.value.detail == "room not found or unavailable"


class TestSeedReservation:
    @freeze_time(FROZEN_DATE)
    def test_seed_creates_requested_reservations(self, db_session):
        ids = ReservationService.seed(db_session, 3)
        assert len(ids) == 3
        assert len(set(ids)) == 3

        rows = db_session.query(Reservation).filter(Reservation.id.in_(ids)).all()
        assert len(rows) == 3
        assert all(r.status == ReservationStatus.CONFIRMED for r in rows)
        assert all(r.check_in == date(2026, 7, 1) for r in rows)
        assert all(r.check_out == date(2026, 7, 2) for r in rows)

        assert db_session.query(User).count() == 100
        assert db_session.query(Room).count() == 100
        seed_emails = (
            db_session.query(User.email)
            .filter(User.email.like("seed-res-%"))
            .count()
        )
        assert seed_emails == 100

    @freeze_time(FROZEN_DATE)
    def test_seed_returns_ids_in_insert_order(self, db_session):
        ids = ReservationService.seed(db_session, 5)
        rows = (
            db_session.query(Reservation)
            .filter(Reservation.id.in_(ids))
            .order_by(Reservation.id)
            .all()
        )
        assert [r.id for r in rows] == ids
        assert all(r.check_in == date(2026, 7, 1) for r in rows)
        assert all(r.check_out == date(2026, 7, 2) for r in rows)

    def test_seed_zero_quantity(self, db_session):
        assert ReservationService.seed(db_session, 0) == []
        assert db_session.query(Reservation).count() == 0
        assert db_session.query(User).count() == 0
        assert db_session.query(Room).count() == 0

    @freeze_time(FROZEN_DATE)
    def test_seed_beyond_pool_size_cycles_pool(self, db_session):
        ids = ReservationService.seed(db_session, 250)
        assert len(ids) == 250
        assert len(set(ids)) == 250
        assert db_session.query(Reservation).count() == 250

        rows = (
            db_session.query(Reservation)
            .filter(Reservation.id.in_(ids))
            .order_by(Reservation.id)
            .all()
        )
        for i, row in enumerate(rows):
            expected = date(2026, 7, 1) + timedelta(days=i // 100)
            assert row.check_in == expected
            assert row.check_out == expected + timedelta(days=1)
