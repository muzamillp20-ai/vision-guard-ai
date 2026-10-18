"""Users API endpoints — stub."""
from fastapi import APIRouter
router = APIRouter(tags=["users"])

@router.get("/")
async def list_users():
    return {"message": "Users endpoint"}
