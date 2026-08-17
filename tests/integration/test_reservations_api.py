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
        assert isinstance(body["id"], int) and body["id"] > 0
        assert isinstance(body["created_at"], str)
        assert isinstance(body["updated_at"], str)


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
        body = response.json()
        assert body["id"] == res_id
        assert body["status"] == "cancelled"


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
        for r in body:
            assert r["user_id"] == user.id
            assert isinstance(r["room_id"], int)
            assert isinstance(r["check_in"], str)
            assert isinstance(r["check_out"], str)
            assert r["status"] in ("confirmed", "cancelled")


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
        for r in body:
            assert r["room_id"] == room.id
            assert isinstance(r["user_id"], int)
            assert isinstance(r["check_in"], str)
            assert isinstance(r["check_out"], str)
            assert r["status"] in ("confirmed", "cancelled")
