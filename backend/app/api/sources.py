"""Sources API endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database import get_db
from app.models.user import VideoSource
from datetime import datetime

router = APIRouter(tags=["sources"])


class SourceCreate(BaseModel):
    name: str
    source_type: str
    configuration: dict = {}


class SourceResponse(BaseModel):
    id: str
    name: str
    source_type: str
    configuration: dict
    enabled: bool
    created_at: datetime
    updated_at: datetime


@router.get("/", response_model=List[SourceResponse])
async def list_sources(db: Session = Depends(get_db)):
    """List all video sources."""
    sources = db.query(VideoSource).all()
    return sources


@router.post("/", response_model=SourceResponse)
async def create_source(source: SourceCreate, db: Session = Depends(get_db)):
    """Create a new video source."""
    db_source = VideoSource(
        name=source.name,
        source_type=source.source_type,
        configuration=source.configuration,
    )
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    return db_source


@router.get("/{source_id}", response_model=SourceResponse)
async def get_source(source_id: str, db: Session = Depends(get_db)):
    """Get a specific video source."""
    source = db.query(VideoSource).filter(VideoSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    return source


@router.delete("/{source_id}")
async def delete_source(source_id: str, db: Session = Depends(get_db)):
    """Delete a video source."""
    source = db.query(VideoSource).filter(VideoSource.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    db.delete(source)
    db.commit()
    return {"message": "Source deleted"}
