from fastapi import status


class TestCreateUser:
    def test_create_user(self, client, db_session):
        payload = {"name": "Alice", "email": "alice@test.com"}
        response = client.post("/users/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        body = response.json()
        assert body["name"] == "Alice"
        assert body["email"] == "alice@test.com"
        assert body["phone"] is None
        assert "id" in body
        assert "created_at" in body
        assert "updated_at" in body

    def test_create_user_with_phone(self, client, db_session):
        payload = {
            "name": "Bob",
            "email": "bob@test.com",
            "phone": "+55 11 99999-9999",
        }
        response = client.post("/users/", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["phone"] == "+55 11 99999-9999"

    def test_create_user_duplicate_email(self, client, user):
        payload = {"name": "Charlie", "email": user.email}
        response = client.post("/users/", json=payload)
        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.json()["detail"] == "email already registered"


class TestGetUser:
    def test_get_user(self, client, user):
        response = client.get(f"/users/{user.id}")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["id"] == user.id
        assert body["name"] == user.name
        assert body["email"] == user.email

    def test_get_user_not_found(self, client):
        response = client.get("/users/999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "user not found"


class TestListUsers:
    def test_list_users_empty(self, client):
        response = client.get("/users/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []

    def test_list_users_paginated(self, client, db_session):
        from api.schemas.user import UserCreate
        from api.services.user_service import UserService

        UserService.create(db_session, UserCreate(name="A", email="a@test.com"))
        UserService.create(db_session, UserCreate(name="B", email="b@test.com"))
        UserService.create(db_session, UserCreate(name="C", email="c@test.com"))

        response = client.get("/users/?skip=1&limit=1")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert len(body) == 1
        assert body[0]["name"] == "B"


class TestUpdateUser:
    def test_update_user(self, client, user):
        payload = {"name": "Alice Updated"}
        response = client.put(f"/users/{user.id}", json=payload)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == "Alice Updated"

    def test_update_user_not_found(self, client):
        payload = {"name": "Ghost"}
        response = client.put("/users/999", json=payload)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "user not found"

    def test_update_user_duplicate_email(self, client, user, second_user):
        payload = {"email": second_user.email}
        response = client.put(f"/users/{user.id}", json=payload)
        assert response.status_code == status.HTTP_409_CONFLICT
        assert response.json()["detail"] == "email already registered"


class TestDeleteUser:
    def test_delete_user(self, client, user):
        response = client.delete(f"/users/{user.id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        get_response = client.get(f"/users/{user.id}")
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_user_not_found(self, client):
        response = client.delete("/users/999")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.json()["detail"] == "user not found"

    def test_delete_user_with_active_reservations(
        self, client, reservation
    ):
        user_id = reservation.user_id
        response = client.delete(f"/users/{user_id}")
        assert response.status_code == status.HTTP_409_CONFLICT
        assert (
            response.json()["detail"]
            == "cannot delete user with active reservations"
        )
