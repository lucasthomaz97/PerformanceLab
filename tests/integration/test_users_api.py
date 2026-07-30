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


class TestGetUser:
    def test_get_user(self, client, user):
        response = client.get(f"/users/{user.id}")
        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["id"] == user.id
        assert body["name"] == user.name
        assert body["email"] == user.email


class TestListUsers:
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


class TestDeleteUser:
    def test_delete_user(self, client, user):
        response = client.delete(f"/users/{user.id}")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        get_response = client.get(f"/users/{user.id}")
        assert get_response.status_code == status.HTTP_404_NOT_FOUND
