from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from api.config import SEED_API_KEY
from api.database import get_db
from api.schemas.seed import SeedUsersRequest, SeedUsersResponse
from api.services.user_service import UserService

router = APIRouter(prefix="/seed", tags=["seed"])


def verify_seed_key(x_seed_key: str = Header(default="")) -> None:
    if not SEED_API_KEY or x_seed_key != SEED_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="invalid or missing seed API key",
        )


@router.post(
    "/users",
    response_model=SeedUsersResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_seed_key)],
)
def seed_users(data: SeedUsersRequest, db: Session = Depends(get_db)):
    ids = UserService.seed(db, data.quantity)
    return SeedUsersResponse(ids=ids, count=len(ids))
