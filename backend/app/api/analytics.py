"""Analytics API endpoints — stub."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter(tags=["analytics"])


@router.get("/summary")
async def analytics_summary(db: Session = Depends(get_db)):
    """Get analytics summary."""
    return {"message": "Analytics summary endpoint"}
