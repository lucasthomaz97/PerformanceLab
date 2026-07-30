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
        assert "id" in body
        assert "created_at" in body
        assert "updated_at" in body

    def test_create_room_with_description(self, client, db_session):
        payload = {
            "name": "102",
            "capacity": 4,
            "price_per_night": "250.00",
            "description": "Suite with ocean view",
        }
        response = client.post("/rooms/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["description"] == "Suite with ocean view"

    def test_create_room_duplicate_name(self, client, room):
        payload = {
            "name": room.name,
            "capacity": 2,
            "price_per_night": "200.00",
        }
        response = client.post("/rooms/", json=payload)
        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.json()["detail"] == "room name already exists"


class TestGetRoom:
    def test_get_room(self, client, room):
        response = client.get(f"/rooms/{room.id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == room.id

    def test_get_room_not_found(self, client):
        response = client.get("/rooms/999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "room not found"


class TestListRooms:
    def test_list_rooms_empty(self, client):
        response = client.get("/rooms/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

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
        assert len(response.json()) == 2

    def test_list_rooms_active_only_false(self, client, room):
        client.delete(f"/rooms/{room.id}")

        response = client.get("/rooms/?active_only=false")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body) == 1
        assert body[0]["is_active"] is False


class TestUpdateRoom:
    def test_update_room(self, client, room):
        payload = {"capacity": 10}
        response = client.put(f"/rooms/{room.id}", json=payload)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["capacity"] == 10

    def test_update_room_not_found(self, client):
        payload = {"name": "Ghost"}
        response = client.put("/rooms/999", json=payload)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "room not found"

    def test_update_room_duplicate_name(self, client, room, second_room):
        payload = {"name": second_room.name}
        response = client.put(f"/rooms/{room.id}", json=payload)
        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.json()["detail"] == "room name already exists"


class TestDeleteRoom:
    def test_delete_room_soft_delete(self, client, room):
        response = client.delete(f"/rooms/{room.id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        get_response = client.get(f"/rooms/{room.id}")
        assert get_response.status_code == status.HTTP_200_OK
        assert get_response.json()["is_active"] is False

    def test_delete_room_not_found(self, client):
        response = client.delete("/rooms/999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "room not found"

    def test_delete_room_with_active_reservations(
        self, client, reservation
    ):
        room_id = reservation.room_id
        response = client.delete(f"/rooms/{room_id}")
        assert response.status_code == status.HTTP_409_CONFLICT
        assert (
            response.json()["detail"]
            == "cannot delete room with active reservations"
        )
