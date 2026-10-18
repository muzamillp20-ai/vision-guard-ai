"""SQLAlchemy models."""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Float, JSON, Text
from app.database import Base
from datetime import datetime
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default="operator")  # admin, operator, viewer
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)


class VideoSource(Base):
    __tablename__ = "video_sources"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    source_type = Column(String, nullable=False)  # webcam, file, rtsp
    configuration = Column(JSON, default={})
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RestrictedZone(Base):
    __tablename__ = "restricted_zones"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    source_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    polygon = Column(JSON, nullable=False)  # [{x, y}, ...]
    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, nullable=False, index=True)
    source_id = Column(String, nullable=False, index=True)
    source_name = Column(String, nullable=False)
    incident_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # low, medium, high, critical
    status = Column(String, nullable=False, default="new")  # new, acknowledged, resolved
    timestamp = Column(DateTime, nullable=False, index=True)
    confidence = Column(Float, nullable=False)
    evidence_ref = Column(String, nullable=True)
    explanation = Column(Text, nullable=False)
    operator_notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    actor_id = Column(String, nullable=True)
    actor_email = Column(String, nullable=True)
    action = Column(String, nullable=False, index=True)
    resource_type = Column(String, nullable=True)
    resource_id = Column(String, nullable=True)
    details = Column(Text, nullable=False)
    ip_address = Column(String, nullable=True)
