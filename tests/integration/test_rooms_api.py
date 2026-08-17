from decimal import Decimal

from fastapi import status


class TestCreateRoom:
    def test_create_room(self, client, db_session):
        payload = {
            "name": "101",
            "capacity": 2,
            "price_per_night": "150.00",
        }
        response = client.post("/rooms/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        body = response.json()
        assert body["name"] == "101"
        assert body["capacity"] == 2
        assert body["price_per_night"] == "150.00"
        assert body["description"] is None
        assert body["is_active"] is True
        assert isinstance(body["id"], int) and body["id"] > 0
        assert isinstance(body["created_at"], str)
        assert isinstance(body["updated_at"], str)


class TestGetRoom:
    def test_get_room(self, client, room):
        response = client.get(f"/rooms/{room.id}")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["id"] == room.id
        assert body["name"] == room.name
        assert body["capacity"] == room.capacity
        assert body["price_per_night"] == str(room.price_per_night)
        assert body["is_active"] is True
        assert isinstance(body["created_at"], str)
        assert isinstance(body["updated_at"], str)


class TestListRooms:
    def test_list_rooms_returns_all(self, client, db_session):
        from api.schemas.room import RoomCreate
        from api.services.room_service import RoomService

        RoomService.create(
            db_session,
            RoomCreate(name="101", capacity=2, price_per_night=Decimal("100")),
        )
        RoomService.create(
            db_session,
            RoomCreate(name="102", capacity=2, price_per_night=Decimal("100")),
        )

        response = client.get("/rooms/")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body) == 2
        names = {r["name"] for r in body}
        assert "101" in names
        assert "102" in names

    def test_list_rooms_paginated(self, client, db_session):
        from api.schemas.room import RoomCreate
        from api.services.room_service import RoomService

        RoomService.create(
            db_session,
            RoomCreate(name="101", capacity=2, price_per_night=Decimal("100")),
        )
        RoomService.create(
            db_session,
            RoomCreate(name="102", capacity=2, price_per_night=Decimal("100")),
        )
        RoomService.create(
            db_session,
            RoomCreate(name="103", capacity=2, price_per_night=Decimal("100")),
        )

        response = client.get("/rooms/?skip=1&limit=1")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body) == 1
        assert body[0]["name"] == "102"


class TestUpdateRoom:
    def test_update_room(self, client, room):
        original_updated_at = room.updated_at.isoformat()
        payload = {"capacity": 10}
        response = client.put(f"/rooms/{room.id}", json=payload)
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["capacity"] == 10
        assert body["name"] == room.name
        assert body["updated_at"] >= original_updated_at


class TestDeleteRoom:
    def test_delete_room(self, client, room):
        response = client.delete(f"/rooms/{room.id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        get_response = client.get(f"/rooms/{room.id}")
        assert get_response.status_code == status.HTTP_200_OK
        assert get_response.json()["is_active"] is False
