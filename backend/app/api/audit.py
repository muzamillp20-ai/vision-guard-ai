"""Audit log API endpoints — stub."""
from fastapi import APIRouter
router = APIRouter(tags=["audit"])

@router.get("/")
async def list_audit_entries():
    return {"message": "Audit log endpoint"}
