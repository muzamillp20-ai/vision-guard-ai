"""Application configuration from environment variables."""
import os
from typing import List


class Settings:
    """Application settings loaded from environment."""
    
    # Server
    APP_NAME: str = "VisionGuard AI"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./visionguard.db"
    )
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("TOKEN_EXPIRE_MINUTES", "1440"))
    PBKDF2_ITERATIONS: int = 100_000
    
    # CORS
    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173"
    ).split(",")
    
    # Evidence storage
    EVIDENCE_DIR: str = os.getenv("EVIDENCE_DIR", "./evidence")
    EVIDENCE_RETENTION_DAYS: int = int(os.getenv("EVIDENCE_RETENTION_DAYS", "30"))
    
    # Model
    MODEL_NAME: str = os.getenv("MODEL_NAME", "coco-ssd")
    MODEL_PATH: str = os.getenv("MODEL_PATH", "")
    USE_TENSORRT: bool = os.getenv("USE_TENSORRT", "false").lower() == "true"
    
    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS]


settings = Settings()
