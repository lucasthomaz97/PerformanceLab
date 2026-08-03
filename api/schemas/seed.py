from pydantic import BaseModel, Field


class SeedUsersRequest(BaseModel):
    quantity: int = Field(ge=1, le=100_000)


class SeedUsersResponse(BaseModel):
    ids: list[int]
    count: int
