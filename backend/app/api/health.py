"""Health check endpoints."""
from fastapi import APIRouter
from datetime import datetime
import os

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "service": "VisionGuard AI API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/ready")
async def readiness_check():
    """Readiness check — verifies database and model availability."""
    checks = {
        "database": "unknown",
        "model": "unknown",
        "evidence_storage": "unknown",
    }
    
    # Check database
    try:
        from app.database import engine
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        checks["database"] = "healthy"
    except Exception:
        checks["database"] = "unhealthy"
    
    # Check model
    try:
        model_path = os.getenv("MODEL_PATH", "")
        if model_path and os.path.exists(model_path):
            checks["model"] = "healthy"
        elif not model_path:
            checks["model"] = "not_configured"
        else:
            checks["model"] = "unhealthy"
    except Exception:
        checks["model"] = "unhealthy"
    
    # Check evidence storage
    try:
        evidence_dir = os.getenv("EVIDENCE_DIR", "./evidence")
        if os.path.isdir(evidence_dir) and os.access(evidence_dir, os.W_OK):
            checks["evidence_storage"] = "healthy"
        else:
            checks["evidence_storage"] = "unhealthy"
    except Exception:
        checks["evidence_storage"] = "unhealthy"
    
    all_healthy = all(v == "healthy" for v in checks.values())
    
    return {
        "status": "ready" if all_healthy else "degraded",
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat(),
    }
