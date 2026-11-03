"""Application configuration module using Pydantic Settings.

Reads and validates environment variables from .env or system environment.
Never exposes plaintext passwords or sensitive credentials in string representations.
"""

from typing import List, Union
from urllib.parse import urlparse
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Metadata
    APP_NAME: str = "Campus Event & Club Management API"
    APP_ENV: str = Field(default="development", description="Runtime environment: development, staging, production")
    DEBUG: bool = Field(default=False, description="Debug mode flag")
    API_V1_PREFIX: str = "/api/v1"

    # Server Binding
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # Cross-Origin Resource Sharing (CORS)
    CORS_ORIGINS: Union[str, List[str]] = Field(
        default="http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173",
        description="Comma-separated or list of allowed HTTP origins"
    )

    # Database Configuration (PostgreSQL 14+ with psycopg synchronous driver)
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://veekshavshetty@localhost:5432/campus_events_dev",
        description="Full SQLAlchemy database connection URL"
    )
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: float = 5.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, list):
            return [str(origin).strip() for origin in v if str(origin).strip()]
        return []

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        return [self.CORS_ORIGINS]

    @property
    def database_name(self) -> str:
        """Extracts the database name from the connection URL."""
        try:
            parsed = urlparse(self.DATABASE_URL)
            return parsed.path.lstrip("/") or "campus_events_dev"
        except Exception:
            return "campus_events_dev"

    @property
    def sanitized_database_url(self) -> str:
        """Safe connection string with masked password for logs and reports."""
        try:
            parsed = urlparse(self.DATABASE_URL)
            if parsed.password:
                netloc = f"{parsed.username}:******@{parsed.hostname}"
                if parsed.port:
                    netloc += f":{parsed.port}"
                return parsed._replace(netloc=netloc).geturl()
            return self.DATABASE_URL
        except Exception:
            return "postgresql+psycopg://<masked>"


settings = Settings()
