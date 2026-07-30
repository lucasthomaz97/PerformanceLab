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

    @freeze_time(FROZEN_DATE)
    def test_create_reservation_user_not_found(self, client, room):
        payload = {
            "user_id": 999,
            "room_id": room.id,
            "check_in": "2026-08-01",
            "check_out": "2026-08-05",
        }
        response = client.post("/reservations/", json=payload)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "user not found"

    @freeze_time(FROZEN_DATE)
    def test_create_reservation_room_not_found(self, client, user):
        payload = {
            "user_id": user.id,
            "room_id": 999,
            "check_in": "2026-08-01",
            "check_out": "2026-08-05",
        }
        response = client.post("/reservations/", json=payload)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "room not found or unavailable"

    @freeze_time(FROZEN_DATE)
    def test_create_reservation_room_inactive(self, client, user, room):
        client.delete(f"/rooms/{room.id}")

        payload = {
            "user_id": user.id,
            "room_id": room.id,
            "check_in": "2026-08-01",
            "check_out": "2026-08-05",
        }
        response = client.post("/reservations/", json=payload)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "room not found or unavailable"

    @freeze_time(FROZEN_DATE)
    def test_create_reservation_overlap(self, client, user, room):
        client.post(
            "/reservations/",
            json={
                "user_id": user.id,
                "room_id": room.id,
                "check_in": "2026-08-01",
                "check_out": "2026-08-10",
            },
        )
        payload = {
            "user_id": user.id,
            "room_id": room.id,
            "check_in": "2026-08-03",
            "check_out": "2026-08-07",
        }
        response = client.post("/reservations/", json=payload)
        assert response.status_code == status.HTTP_409_CONFLICT
        assert (
            response.json()["detail"]
            == "room already reserved for the selected dates"
        )

    @freeze_time(FROZEN_DATE)
    def test_create_reservation_no_overlap_adjacent(self, client, user, room):
        client.post(
            "/reservations/",
            json={
                "user_id": user.id,
                "room_id": room.id,
                "check_in": "2026-08-01",
                "check_out": "2026-08-05",
            },
        )
        payload = {
            "user_id": user.id,
            "room_id": room.id,
            "check_in": "2026-08-05",
            "check_out": "2026-08-10",
        }
        response = client.post("/reservations/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "confirmed"

    @freeze_time(FROZEN_DATE)
    def test_create_reservation_different_rooms(self, client, user, room, second_room):
        client.post(
            "/reservations/",
            json={
                "user_id": user.id,
                "room_id": room.id,
                "check_in": "2026-08-01",
                "check_out": "2026-08-10",
            },
        )
        payload = {
            "user_id": user.id,
            "room_id": second_room.id,
            "check_in": "2026-08-01",
            "check_out": "2026-08-10",
        }
        response = client.post("/reservations/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "confirmed"


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
        res_id = create_resp.json()["id"]

        response = client.patch(f"/reservations/{res_id}/cancel")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "cancelled"

    @freeze_time(FROZEN_DATE)
    def test_cancel_already_cancelled(self, client, reservation):
        res_id = reservation.id
        client.patch(f"/reservations/{res_id}/cancel")
        response = client.patch(f"/reservations/{res_id}/cancel")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @freeze_time(FROZEN_DATE)
    def test_cancel_completed(self, client, reservation, db_session):
        from api.models.reservation import Reservation, ReservationStatus

        res_id = reservation.id
        r = db_session.query(Reservation).filter(Reservation.id == res_id).first()
        r.status = ReservationStatus.COMPLETED
        db_session.commit()

        response = client.patch(f"/reservations/{res_id}/cancel")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cancel_not_found(self, client):
        response = client.patch("/reservations/999/cancel")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "reservation not found"


class TestListUserReservations:
    @freeze_time(FROZEN_DATE)
    def test_list_user_reservations(self, client, user, room, second_room):
        client.post(
            "/reservations/",
            json={
                "user_id": user.id,
                "room_id": room.id,
                "check_in": "2026-08-01",
                "check_out": "2026-08-05",
            },
        )
        client.post(
            "/reservations/",
            json={
                "user_id": user.id,
                "room_id": second_room.id,
                "check_in": "2026-09-01",
                "check_out": "2026-09-05",
            },
        )

        response = client.get(f"/reservations/user/{user.id}")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body) == 2
        assert all(r["user_id"] == user.id for r in body)

    def test_list_user_reservations_not_found(self, client):
        response = client.get("/reservations/user/999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "user not found"


class TestListRoomReservations:
    @freeze_time(FROZEN_DATE)
    def test_list_room_reservations(self, client, user, room, second_user):
        client.post(
            "/reservations/",
            json={
                "user_id": user.id,
                "room_id": room.id,
                "check_in": "2026-08-01",
                "check_out": "2026-08-05",
            },
        )
        client.post(
            "/reservations/",
            json={
                "user_id": second_user.id,
                "room_id": room.id,
                "check_in": "2026-09-01",
                "check_out": "2026-09-05",
            },
        )

        response = client.get(f"/reservations/room/{room.id}")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body) == 2
        assert all(r["room_id"] == room.id for r in body)

    def test_list_room_reservations_room_inactive(self, client, room):
        client.delete(f"/rooms/{room.id}")
        response = client.get(f"/reservations/room/{room.id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "room not found or unavailable"
