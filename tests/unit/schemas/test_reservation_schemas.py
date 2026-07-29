from datetime import date

import pytest
from freezegun import freeze_time
from pydantic import ValidationError

from api.schemas.reservation import ReservationCreate

FROZEN_DATE = "2026-07-01"


class TestReservationCreate:
    @freeze_time(FROZEN_DATE)
    def test_valid(self):
        data = ReservationCreate(
            user_id=1,
            room_id=1,
            check_in=date(2026, 8, 1),
            check_out=date(2026, 8, 5),
        )
        assert data.user_id == 1
        assert data.room_id == 1
        assert data.check_in == date(2026, 8, 1)
        assert data.check_out == date(2026, 8, 5)

    @freeze_time(FROZEN_DATE)
    def test_check_in_today_allowed(self):
        data = ReservationCreate(
            user_id=1,
            room_id=1,
            check_in=date(2026, 7, 1),
            check_out=date(2026, 7, 5),
        )
        assert data.check_in == date(2026, 7, 1)

    @freeze_time(FROZEN_DATE)
    def test_check_in_past_raises(self):
        with pytest.raises(ValidationError):
            ReservationCreate(
                user_id=1,
                room_id=1,
                check_in=date(2026, 6, 30),
                check_out=date(2026, 7, 5),
            )

    @freeze_time(FROZEN_DATE)
    def test_check_out_equal_check_in_raises(self):
        with pytest.raises(ValidationError):
            ReservationCreate(
                user_id=1,
                room_id=1,
                check_in=date(2026, 8, 1),
                check_out=date(2026, 8, 1),
            )

    @freeze_time(FROZEN_DATE)
    def test_check_out_before_check_in_raises(self):
        with pytest.raises(ValidationError):
            ReservationCreate(
                user_id=1,
                room_id=1,
                check_in=date(2026, 8, 5),
                check_out=date(2026, 8, 1),
            )
