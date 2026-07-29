import datetime

from pydantic import BaseModel, field_validator

from api.models.reservation import ReservationStatus


class ReservationCreate(BaseModel):
    user_id: int
    room_id: int
    check_in: datetime.date
    check_out: datetime.date

    @field_validator("check_in")
    @classmethod
    def validate_check_in(cls, v: datetime.date) -> datetime.date:
        if v < datetime.date.today():
            raise ValueError("check_in must be today or in the future")
        return v

    @field_validator("check_out")
    @classmethod
    def validate_check_out(
        cls, v: datetime.date, info
    ) -> datetime.date:
        if "check_in" in info.data and v <= info.data["check_in"]:
            raise ValueError("check_out must be after check_in")
        return v


class ReservationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int
    room_id: int
    check_in: datetime.date
    check_out: datetime.date
    status: ReservationStatus
    created_at: datetime.datetime
    updated_at: datetime.datetime
