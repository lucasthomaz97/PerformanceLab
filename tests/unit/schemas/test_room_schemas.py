from decimal import Decimal

import pytest
from pydantic import ValidationError

from api.schemas.room import RoomCreate, RoomUpdate


class TestRoomCreate:
    def test_valid_minimal(self):
        data = RoomCreate(name="101", capacity=2, price_per_night=Decimal("150.00"))
        assert data.name == "101"
        assert data.capacity == 2
        assert data.price_per_night == Decimal("150.00")
        assert data.description is None

    def test_valid_with_description(self):
        data = RoomCreate(
            name="102",
            capacity=4,
            price_per_night=Decimal("250.00"),
            description="Suite with ocean view",
        )
        assert data.description == "Suite with ocean view"

    def test_trailing_whitespace_stripped(self):
        data = RoomCreate(name="  101  ", capacity=2, price_per_night=Decimal("100"))
        assert data.name == "101"

    def test_name_empty_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomCreate(name="", capacity=2, price_per_night=Decimal("100"))
        assert exc.value.errors()[0]["loc"] == ("name",)

    def test_name_whitespace_only_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomCreate(name="   ", capacity=2, price_per_night=Decimal("100"))
        assert exc.value.errors()[0]["loc"] == ("name",)

    def test_name_too_long_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomCreate(name="R" * 51, capacity=2, price_per_night=Decimal("100"))
        assert exc.value.errors()[0]["loc"] == ("name",)

    def test_name_max_length_allowed(self):
        data = RoomCreate(name="R" * 50, capacity=2, price_per_night=Decimal("100"))
        assert len(data.name) == 50

    def test_capacity_zero_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomCreate(name="101", capacity=0, price_per_night=Decimal("100"))
        assert exc.value.errors()[0]["loc"] == ("capacity",)

    def test_capacity_negative_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomCreate(name="101", capacity=-1, price_per_night=Decimal("100"))
        assert exc.value.errors()[0]["loc"] == ("capacity",)

    def test_price_zero_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomCreate(name="101", capacity=2, price_per_night=Decimal("0"))
        assert exc.value.errors()[0]["loc"] == ("price_per_night",)

    def test_price_negative_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomCreate(name="101", capacity=2, price_per_night=Decimal("-1"))
        assert exc.value.errors()[0]["loc"] == ("price_per_night",)

    def test_description_too_long_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomCreate(
                name="101",
                capacity=2,
                price_per_night=Decimal("100"),
                description="X" * 501,
            )
        assert exc.value.errors()[0]["loc"] == ("description",)

    def test_description_max_length_allowed(self):
        data = RoomCreate(
            name="101",
            capacity=2,
            price_per_night=Decimal("100"),
            description="X" * 500,
        )
        assert len(data.description) == 500


class TestRoomUpdate:
    def test_valid_partial_name(self):
        data = RoomUpdate(name="Presidential Suite")
        assert data.name == "Presidential Suite"
        assert data.capacity is None

    def test_valid_partial_capacity(self):
        data = RoomUpdate(capacity=10)
        assert data.capacity == 10

    def test_valid_partial_price(self):
        data = RoomUpdate(price_per_night=Decimal("300.00"))
        assert data.price_per_night == Decimal("300.00")

    def test_valid_all_fields(self):
        data = RoomUpdate(
            name="Deluxe",
            capacity=3,
            price_per_night=Decimal("200.00"),
            description="Updated",
        )
        assert data.name == "Deluxe"
        assert data.capacity == 3
        assert data.price_per_night == Decimal("200.00")
        assert data.description == "Updated"

    def test_name_empty_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomUpdate(name="")
        assert exc.value.errors()[0]["loc"] == ("name",)

    def test_name_too_long_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomUpdate(name="R" * 51)
        assert exc.value.errors()[0]["loc"] == ("name",)

    def test_capacity_zero_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomUpdate(capacity=0)
        assert exc.value.errors()[0]["loc"] == ("capacity",)

    def test_capacity_negative_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomUpdate(capacity=-1)
        assert exc.value.errors()[0]["loc"] == ("capacity",)

    def test_price_zero_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomUpdate(price_per_night=Decimal("0"))
        assert exc.value.errors()[0]["loc"] == ("price_per_night",)

    def test_price_negative_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomUpdate(price_per_night=Decimal("-1"))
        assert exc.value.errors()[0]["loc"] == ("price_per_night",)

    def test_description_too_long_raises(self):
        with pytest.raises(ValidationError) as exc:
            RoomUpdate(description="X" * 501)
        assert exc.value.errors()[0]["loc"] == ("description",)
