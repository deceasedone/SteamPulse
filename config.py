"""Pipeline configuration. Every value is overridable by environment variable."""
import os

from dotenv import load_dotenv

load_dotenv()


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


# --- GCP ---
PROJECT_ID = os.getenv("GCP_PROJECT_ID", "steampulse-data-eng")
BUCKET_NAME = os.getenv("GCS_BUCKET", "steampulse-raw-lake")
RAW_DATASET = os.getenv("BQ_RAW_DATASET", "steam_raw")
RAW_TABLE = os.getenv("BQ_RAW_TABLE", "gcs_raw_json")
MART_DATASET = os.getenv("BQ_MART_DATASET", "dbt_gsinha")

RAW_TABLE_FQN = f"{PROJECT_ID}.{RAW_DATASET}.{RAW_TABLE}"
STG_GAMES_FQN = f"{PROJECT_ID}.{MART_DATASET}.stg_games"
MART_TRENDS_FQN = f"{PROJECT_ID}.{MART_DATASET}.mart_trends"
MART_PUBLISHERS_FQN = f"{PROJECT_ID}.{MART_DATASET}.mart_publishers"

# --- GCS layout ---
# The BigQuery external table globs raw_layer/*.
RAW_PREFIX = os.getenv("GCS_RAW_PREFIX", "raw_layer")
# State lives in GCS so Cloud Run Jobs can resume across executions.
STATE_PREFIX = os.getenv("GCS_STATE_PREFIX", "pipeline_state")

# --- Ingestion ---
TARGET_GAMES = _int("TARGET_GAMES", 10000)
BATCH_SIZE = _int("BATCH_SIZE", 10)
BATCH_SLEEP = float(os.getenv("BATCH_SLEEP", "2"))
REQUEST_TIMEOUT = _int("REQUEST_TIMEOUT", 15)
NEW_RELEASE_SCAN_PAGES = _int("NEW_RELEASE_SCAN_PAGES", 5)
MAX_RETRIES = _int("MAX_RETRIES", 4)
RATE_LIMIT_SLEEP = _int("RATE_LIMIT_SLEEP", 60)
# Drives the currency of price_overview.
STEAM_COUNTRY_CODE = os.getenv("STEAM_COUNTRY_CODE", "IN")
STEAM_API_KEY = os.getenv("STEAM_API_KEY")

# Local mirroring is useful on a workstation, pointless on ephemeral compute.
LOCAL_DATA_DIR = os.getenv("LOCAL_DATA_DIR", "data")
WRITE_LOCAL_BATCHES = os.getenv("WRITE_LOCAL_BATCHES", "true").lower() == "true"

USER_AGENT = os.getenv(
    "USER_AGENT",
    "SteamPulse/1.0 (+https://github.com/deceasedone/SteamPulse)",
)
