"""Zones API endpoints — stub."""
from fastapi import APIRouter
router = APIRouter(tags=["zones"])

@router.get("/")
async def list_zones():
    return {"message": "Zones endpoint"}
