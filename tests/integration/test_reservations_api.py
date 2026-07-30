from datetime import date

from fastapi import status
from freezegun import freeze_time

from tests.integration.conftest import FROZEN_DATE


class TestCreateReservation:
    @freeze_time(FROZEN_DATE)
    def test_create_reservation(self, client, user, room):
        payload = {
            "user_id": user.id,
            "room_id": room.id,
            "check_in": "2026-08-01",
            "check_out": "2026-08-05",
        }
        response = client.post("/reservations/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        body = response.json()
        assert body["user_id"] == user.id
        assert body["room_id"] == room.id
        assert body["check_in"] == "2026-08-01"
        assert body["check_out"] == "2026-08-05"
        assert body["status"] == "confirmed"
        assert "id" in body
        assert "created_at" in body
        assert "updated_at" in body


class TestCancelReservation:
    @freeze_time(FROZEN_DATE)
    def test_cancel_reservation(self, client, user, room):
        create_resp = client.post(
            "/reservations/",
            json={
                "user_id": user.id,
                "room_id": room.id,
                "check_in": "2026-08-01",
                "check_out": "2026-08-05",
            },
        )
        assert create_resp.status_code == status.HTTP_201_CREATED
        res_id = create_resp.json()["id"]

        response = client.patch(f"/reservations/{res_id}/cancel")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "cancelled"


class TestListUserReservations:
    @freeze_time(FROZEN_DATE)
    def test_list_user_reservations(self, client, user, room, second_room):
        resp1 = client.post(
            "/reservations/",
            json={
                "user_id": user.id,
                "room_id": room.id,
                "check_in": "2026-08-01",
                "check_out": "2026-08-05",
            },
        )
        assert resp1.status_code == status.HTTP_201_CREATED
        resp2 = client.post(
            "/reservations/",
            json={
                "user_id": user.id,
                "room_id": second_room.id,
                "check_in": "2026-09-01",
                "check_out": "2026-09-05",
            },
        )
        assert resp2.status_code == status.HTTP_201_CREATED

        response = client.get(f"/reservations/user/{user.id}")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body) == 2
        assert all(r["user_id"] == user.id for r in body)


class TestListRoomReservations:
    @freeze_time(FROZEN_DATE)
    def test_list_room_reservations(self, client, user, room, second_user):
        resp1 = client.post(
            "/reservations/",
            json={
                "user_id": user.id,
                "room_id": room.id,
                "check_in": "2026-08-01",
                "check_out": "2026-08-05",
            },
        )
        assert resp1.status_code == status.HTTP_201_CREATED
        resp2 = client.post(
            "/reservations/",
            json={
                "user_id": second_user.id,
                "room_id": room.id,
                "check_in": "2026-09-01",
                "check_out": "2026-09-05",
            },
        )
        assert resp2.status_code == status.HTTP_201_CREATED

        response = client.get(f"/reservations/room/{room.id}")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body) == 2
        assert all(r["room_id"] == room.id for r in body)
