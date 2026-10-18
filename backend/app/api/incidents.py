"""Incidents API endpoints — stub."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import Incident

router = APIRouter(tags=["incidents"])


@router.get("/")
async def list_incidents(db: Session = Depends(get_db)):
    """List all incidents."""
    incidents = db.query(Incident).order_by(Incident.timestamp.desc()).all()
    return incidents


@router.get("/{incident_id}")
async def get_incident(incident_id: str, db: Session = Depends(get_db)):
    """Get incident details."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    return incident


@router.patch("/{incident_id}")
async def update_incident(incident_id: str, db: Session = Depends(get_db)):
    """Update incident status."""
    return {"message": "Update endpoint"}
