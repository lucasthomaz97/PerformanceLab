import pytest
from pydantic import ValidationError

from api.schemas.user import UserCreate, UserUpdate


class TestUserCreate:
    def test_valid_minimal(self):
        data = UserCreate(name="Alice", email="alice@test.com")
        assert data.name == "Alice"
        assert data.email == "alice@test.com"
        assert data.phone is None

    def test_valid_with_phone(self):
        data = UserCreate(name="Bob", email="bob@test.com", phone="+55 11 99999-9999")
        assert data.phone == "+55 11 99999-9999"

    def test_valid_phone_simple_digits(self):
        data = UserCreate(name="Charlie", email="charlie@test.com", phone="11999999999")
        assert data.phone == "11999999999"

    def test_trailing_whitespace_stripped(self):
        data = UserCreate(name="  Alice  ", email="alice@test.com")
        assert data.name == "Alice"

    def test_name_empty_raises(self):
        with pytest.raises(ValidationError) as exc:
            UserCreate(name="", email="alice@test.com")
        assert exc.value.errors()[0]["loc"] == ("name",)

    def test_name_whitespace_only_raises(self):
        with pytest.raises(ValidationError) as exc:
            UserCreate(name="   ", email="alice@test.com")
        assert exc.value.errors()[0]["loc"] == ("name",)

    def test_name_too_long_raises(self):
        with pytest.raises(ValidationError) as exc:
            UserCreate(name="A" * 101, email="alice@test.com")
        assert exc.value.errors()[0]["loc"] == ("name",)

    def test_name_max_length_allowed(self):
        data = UserCreate(name="A" * 100, email="alice@test.com")
        assert len(data.name) == 100

    def test_phone_invalid_format_raises(self):
        with pytest.raises(ValidationError) as exc:
            UserCreate(name="Alice", email="alice@test.com", phone="abc")
        assert exc.value.errors()[0]["loc"] == ("phone",)

    def test_phone_too_short_raises(self):
        with pytest.raises(ValidationError) as exc:
            UserCreate(name="Alice", email="alice@test.com", phone="123456")
        assert exc.value.errors()[0]["loc"] == ("phone",)

    def test_phone_too_long_raises(self):
        with pytest.raises(ValidationError) as exc:
            UserCreate(name="Alice", email="alice@test.com", phone="1" * 21)
        assert exc.value.errors()[0]["loc"] == ("phone",)

    def test_phone_none_allowed(self):
        data = UserCreate(name="Alice", email="alice@test.com", phone=None)
        assert data.phone is None


class TestUserUpdate:
    def test_valid_partial_name(self):
        data = UserUpdate(name="Alice Updated")
        assert data.name == "Alice Updated"
        assert data.email is None
        assert data.phone is None

    def test_valid_partial_email(self):
        data = UserUpdate(email="new@test.com")
        assert data.email == "new@test.com"
        assert data.name is None

    def test_valid_partial_phone(self):
        data = UserUpdate(phone="+55 21 98888-8888")
        assert data.phone == "+55 21 98888-8888"

    def test_valid_all_fields(self):
        data = UserUpdate(name="Alice", email="alice@test.com", phone="11999999999")
        assert data.name == "Alice"
        assert data.email == "alice@test.com"
        assert data.phone == "11999999999"

    def test_name_trailing_whitespace_stripped(self):
        data = UserUpdate(name="  Alice  ")
        assert data.name == "Alice"

    def test_name_empty_raises(self):
        with pytest.raises(ValidationError) as exc:
            UserUpdate(name="")
        assert exc.value.errors()[0]["loc"] == ("name",)

    def test_name_too_long_raises(self):
        with pytest.raises(ValidationError) as exc:
            UserUpdate(name="B" * 101)
        assert exc.value.errors()[0]["loc"] == ("name",)

    def test_phone_too_short_raises(self):
        with pytest.raises(ValidationError) as exc:
            UserUpdate(phone="123456")
        assert exc.value.errors()[0]["loc"] == ("phone",)
