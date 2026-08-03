import os
from pathlib import Path

from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True, encoding="utf-8")

DB_USER: str = os.getenv("DB_USER", "postgres")
DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")
DB_HOST: str = os.getenv("DB_HOST", "localhost")
DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
DB_NAME: str = os.getenv("DB_NAME", "performancelab")
SEED_API_KEY: str = os.getenv("SEED_API_KEY", "")
ENABLE_LOADTEST_ENDPOINTS: bool = os.getenv(
    "ENABLE_LOADTEST_ENDPOINTS", "false"
).lower() in {"1", "true", "yes", "on"}
