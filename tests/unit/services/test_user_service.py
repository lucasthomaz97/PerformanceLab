import pytest
from fastapi import HTTPException

from api.schemas.user import UserCreate, UserUpdate
from api.services.user_service import UserService


class TestCreateUser:
    def test_create_user_success(self, db_session):
        data = UserCreate(name="Alice", email="alice@test.com")
        user = UserService.create(db_session, data)
        assert user.id is not None
        assert user.name == "Alice"
        assert user.email == "alice@test.com"
        assert user.phone is None

    def test_create_user_with_phone(self, db_session):
        data = UserCreate(
            name="Bob",
            email="bob@test.com",
            phone="+55 11 99999-9999",
        )
        user = UserService.create(db_session, data)
        assert user.name == "Bob"
        assert user.email == "bob@test.com"
        assert user.phone == "+55 11 99999-9999"

    def test_create_user_duplicate_email(self, db_session, user):
        data = UserCreate(name="Charlie", email=user.email)
        with pytest.raises(HTTPException) as exc:
            UserService.create(db_session, data)
        assert exc.value.status_code == 409
        assert exc.value.detail == "email already registered"


class TestGetUser:
    def test_get_user_success(self, db_session, user):
        result = UserService.get(db_session, user.id)
        assert result.id == user.id
        assert result.name == user.name
        assert result.email == user.email

    def test_get_user_not_found(self, db_session):
        with pytest.raises(HTTPException) as exc:
            UserService.get(db_session, 999)
        assert exc.value.status_code == 404
        assert exc.value.detail == "user not found"


class TestListUsers:
    def test_list_users_empty(self, db_session):
        result = UserService.get_multi(db_session)
        assert result == []

    def test_list_users_returns_all(self, db_session):
        UserService.create(db_session, UserCreate(name="A", email="a@test.com"))
        UserService.create(db_session, UserCreate(name="B", email="b@test.com"))
        result = UserService.get_multi(db_session)
        assert len(result) == 2
        assert {u.name for u in result} == {"A", "B"}

    def test_list_users_paginated(self, db_session):
        UserService.create(db_session, UserCreate(name="A", email="a@test.com"))
        u2 = UserService.create(db_session, UserCreate(name="B", email="b@test.com"))
        UserService.create(db_session, UserCreate(name="C", email="c@test.com"))
        result = UserService.get_multi(db_session, skip=1, limit=1)
        assert len(result) == 1
        assert result[0].id == u2.id
        assert result[0].name == "B"


class TestUpdateUser:
    def test_update_user_name(self, db_session, user):
        data = UserUpdate(name="Alice Updated")
        result = UserService.update(db_session, user.id, data)
        assert result.name == "Alice Updated"
        assert result.email == user.email

    def test_update_user_email(self, db_session, user):
        data = UserUpdate(email="alice_new@test.com")
        result = UserService.update(db_session, user.id, data)
        assert result.email == "alice_new@test.com"
        assert result.name == user.name

    def test_update_user_not_found(self, db_session):
        data = UserUpdate(name="Ghost")
        with pytest.raises(HTTPException) as exc:
            UserService.update(db_session, 999, data)
        assert exc.value.status_code == 404
        assert exc.value.detail == "user not found"

    def test_update_user_duplicate_email(self, db_session, user, second_user):
        data = UserUpdate(email=second_user.email)
        with pytest.raises(HTTPException) as exc:
            UserService.update(db_session, user.id, data)
        assert exc.value.status_code == 409
        assert exc.value.detail == "email already registered"


class TestDeleteUser:
    def test_delete_user_success(self, db_session, user):
        UserService.delete(db_session, user.id)
        with pytest.raises(HTTPException) as exc:
            UserService.get(db_session, user.id)
        assert exc.value.status_code == 404
        assert exc.value.detail == "user not found"

    def test_delete_user_not_found(self, db_session):
        with pytest.raises(HTTPException) as exc:
            UserService.delete(db_session, 999)
        assert exc.value.status_code == 404
        assert exc.value.detail == "user not found"

    def test_delete_user_with_active_reservations(self, db_session, reservation):
        user_id = reservation.user_id
        with pytest.raises(HTTPException) as exc:
            UserService.delete(db_session, user_id)
        assert exc.value.status_code == 409
        assert exc.value.detail == "cannot delete user with active reservations"
