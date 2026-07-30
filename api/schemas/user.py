import datetime
import re

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("name must not be empty")
        if len(stripped) > 100:
            raise ValueError("name must not exceed 100 characters")
        if not isinstance(v, str):
            raise ValueError("name must be a string")
        return stripped

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^\+?[\d\s\-()]{7,20}$", v):
            raise ValueError(
                "phone must be a valid format "
                "(7-20 digits, optional +, spaces, dashes, parentheses)"
            )
        return v


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("name must not be empty")
            if len(stripped) > 100:
                raise ValueError("name must not exceed 100 characters")
            if not isinstance(v, str):
                raise ValueError("name must be a string")
            return stripped
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is not None and not re.match(r"^\+?[\d\s\-()]{7,20}$", v):
            raise ValueError(
                "phone must be a valid format "
                "(7-20 digits, optional +, spaces, dashes, parentheses)"
            )
        return v


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    email: str
    phone: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime
