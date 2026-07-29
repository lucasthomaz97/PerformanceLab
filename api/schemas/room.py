import datetime
from decimal import Decimal

from pydantic import BaseModel, field_validator


class RoomCreate(BaseModel):
    name: str
    capacity: int
    price_per_night: Decimal
    description: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("name must not be empty")
        if len(stripped) > 50:
            raise ValueError("name must not exceed 50 characters")
        if not isinstance(v, str):
            raise ValueError("name must be a string")
        return stripped

    @field_validator("capacity")
    @classmethod
    def validate_capacity(cls, v: int) -> int:
        if v < 1:
            raise ValueError("capacity must be greater than 0")
        return v

    @field_validator("price_per_night")
    @classmethod
    def validate_price(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("price_per_night must be greater than 0")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 500:
            raise ValueError("description must not exceed 500 characters")
        return v


class RoomUpdate(BaseModel):
    name: str | None = None
    capacity: int | None = None
    price_per_night: Decimal | None = None
    description: str | None = None
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None:
            stripped = v.strip()
            if not stripped:
                raise ValueError("name must not be empty")
            if len(stripped) > 50:
                raise ValueError("name must not exceed 50 characters")
            if not isinstance(v, str):
                raise ValueError("name must be a string")
            return stripped
        return v

    @field_validator("capacity")
    @classmethod
    def validate_capacity(cls, v: int | None) -> int | None:
        if v is not None and v < 1:
            raise ValueError("capacity must be greater than 0")
        return v

    @field_validator("price_per_night")
    @classmethod
    def validate_price(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("price_per_night must be greater than 0")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 500:
            raise ValueError("description must not exceed 500 characters")
        return v


class RoomResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    capacity: int
    price_per_night: Decimal
    description: str | None
    is_active: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime
