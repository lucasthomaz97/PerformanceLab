from decimal import Decimal

import pytest
from fastapi import HTTPException

from api.schemas.room import RoomCreate, RoomUpdate
from api.services.room_service import RoomService


class TestCreateRoom:
    def test_create_room_success(self, db_session):
        data = RoomCreate(name="101", capacity=2, price_per_night=Decimal("150.00"))
        room = RoomService.create(db_session, data)
        assert room.id is not None
        assert room.name == "101"
        assert room.capacity == 2
        assert room.price_per_night == Decimal("150.00")
        assert room.description is None
        assert room.is_active is True

    def test_create_room_with_description(self, db_session):
        data = RoomCreate(
            name="102",
            capacity=4,
            price_per_night=Decimal("250.00"),
            description="Suite with ocean view",
        )
        room = RoomService.create(db_session, data)
        assert room.description == "Suite with ocean view"

    def test_create_room_duplicate_name(self, db_session, room):
        data = RoomCreate(name=room.name, capacity=2, price_per_night=Decimal("200.00"))
        with pytest.raises(HTTPException) as exc:
            RoomService.create(db_session, data)
        assert exc.value.status_code == 409
        assert exc.value.detail == "room name already exists"


class TestGetRoom:
    def test_get_room_success(self, db_session, room):
        result = RoomService.get(db_session, room.id)
        assert result.id == room.id
        assert result.name == room.name

    def test_get_room_not_found(self, db_session):
        with pytest.raises(HTTPException) as exc:
            RoomService.get(db_session, 999)
        assert exc.value.status_code == 404
        assert exc.value.detail == "room not found"


class TestListRooms:
    def test_list_rooms_empty(self, db_session):
        result = RoomService.get_multi(db_session)
        assert result == []

    def test_list_rooms_basic(self, db_session):
        RoomService.create(
            db_session,
            RoomCreate(name="101", capacity=2, price_per_night=Decimal("100")),
        )
        RoomService.create(
            db_session,
            RoomCreate(name="102", capacity=2, price_per_night=Decimal("100")),
        )
        result = RoomService.get_multi(db_session)
        assert len(result) == 2

    def test_list_rooms_excludes_inactive(self, db_session, room):
        RoomService.delete(db_session, room.id)
        result = RoomService.get_multi(db_session)
        assert len(result) == 0

    def test_list_rooms_includes_inactive_when_requested(self, db_session, room):
        RoomService.delete(db_session, room.id)
        result = RoomService.get_multi(db_session, active_only=False)
        assert len(result) == 1
        assert result[0].is_active is False


class TestUpdateRoom:
    def test_update_room_capacity(self, db_session, room):
        data = RoomUpdate(capacity=10)
        result = RoomService.update(db_session, room.id, data)
        assert result.capacity == 10

    def test_update_room_name(self, db_session, room):
        data = RoomUpdate(name="Presidential Suite")
        result = RoomService.update(db_session, room.id, data)
        assert result.name == "Presidential Suite"

    def test_update_room_not_found(self, db_session):
        data = RoomUpdate(name="Ghost")
        with pytest.raises(HTTPException) as exc:
            RoomService.update(db_session, 999, data)
        assert exc.value.status_code == 404
        assert exc.value.detail == "room not found"

    def test_update_room_duplicate_name(self, db_session, room, second_room):
        data = RoomUpdate(name=second_room.name)
        with pytest.raises(HTTPException) as exc:
            RoomService.update(db_session, room.id, data)
        assert exc.value.status_code == 409
        assert exc.value.detail == "room name already exists"


class TestDeleteRoom:
    def test_delete_room_soft_delete(self, db_session, room):
        RoomService.delete(db_session, room.id)
        result = RoomService.get(db_session, room.id)
        assert result.is_active is False

    def test_delete_room_not_found(self, db_session):
        with pytest.raises(HTTPException) as exc:
            RoomService.delete(db_session, 999)
        assert exc.value.status_code == 404
        assert exc.value.detail == "room not found"

    def test_delete_room_with_active_reservations(self, db_session, reservation):
        room_id = reservation.room_id
        with pytest.raises(HTTPException) as exc:
            RoomService.delete(db_session, room_id)
        assert exc.value.status_code == 409
        assert exc.value.detail == "cannot delete room with active reservations"
