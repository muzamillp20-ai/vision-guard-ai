"""
VisionGuard AI — FastAPI Backend
Production-ready API server for computer vision safety monitoring.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

from app.core.config import settings
from app.api import health, auth, sources, incidents, analytics, zones, users, audit

app = FastAPI(
    title="VisionGuard AI API",
    description="Intelligent Visual Safety & Incident Detection Platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api/auth")
app.include_router(sources.router, prefix="/api/sources")
app.include_router(incidents.router, prefix="/api/incidents")
app.include_router(analytics.router, prefix="/api/analytics")
app.include_router(zones.router, prefix="/api/zones")
app.include_router(users.router, prefix="/api/users")
app.include_router(audit.router, prefix="/api/audit")


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global error handler — never expose stack traces."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
