"""
Centralized configuration for the Baytology recommendation service.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    worker_enabled: bool = True
    rabbitmq_enabled: bool = True
    rabbitmq_host: str = "127.0.0.1"
    rabbitmq_port: int = 5672
    rabbitmq_username: str = "guest"
    rabbitmq_password: str = "guest"
    rabbitmq_recommendation_queue: str = "recommendations"
    rabbitmq_prefetch_count: int = 5
    worker_retry_delay_seconds: int = 5
    worker_max_retries: int = 3
    dotnet_api_base_url: str = "http://127.0.0.1:5053"
    dotnet_ai_service_token: str = ""
    dotnet_ai_service_token_header: str = "X-AI-Service-Token"
    dotnet_verify_tls: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
