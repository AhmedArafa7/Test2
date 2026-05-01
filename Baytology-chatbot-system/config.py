"""
Centralized Configuration Management for Baytology.

Uses Pydantic Settings to load environment variables from .env file
with type validation and default values.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    google_api_key: str = ""
    
    # Data Source Configuration
    property_data_source: str = "sql"
    csv_file_path: str = "egypt_real_estate_preprocessed.csv"
    database_connection_string: str = ""
    sql_server_driver: str = "ODBC Driver 17 for SQL Server"
    sql_server_server: str = "localhost"
    sql_server_database: str = "BaytologyDB"
    sql_server_trusted_connection: bool = True
    sql_server_username: str = ""
    sql_server_password: str = ""
    sql_server_encrypt: bool = False
    sql_server_trust_server_certificate: bool = True
    sql_query_timeout_seconds: int = 30
    
    # LLM Configuration  
    lm_studio_url: str = "http://localhost:1234/v1"
    lm_studio_model: str = "gemma-2-9b-it"

    # Whisper Configuration
    whisper_model: str = "large-v3"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_beam_size: int = 5

    # Image Search Configuration
    image_search_max_candidates: int = 200
    image_search_request_timeout_seconds: int = 5
    
    # App Settings
    max_results: int = 20
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra env vars not defined here


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Singleton instance for easy import
settings = get_settings()
