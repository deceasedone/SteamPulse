"""SteamPulse refresh: ingest raw metadata, then rebuild the marts.

Transform must not start until ingestion finishes, or it rebuilds stg_games
from a half-written lake.
"""
import os
from datetime import datetime, timedelta

from airflow import DAG
from airflow.providers.google.cloud.operators.cloud_run import (
    CloudRunExecuteJobOperator,
)

GCP_PROJECT = os.getenv("GCP_PROJECT_ID", "steampulse-data-eng")
GCP_REGION = os.getenv("GCP_REGION", "us-central1")
GCP_CONN_ID = os.getenv("GCP_CONN_ID", "google_cloud_default")

# Weekly keeps a worst-case full refresh (~1.8h Cloud Run) inside the free tier;
# daily does not. See README > Running costs.
SCHEDULE = os.getenv("STEAM_DAG_SCHEDULE", "@weekly")

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    "steam_ingest_orchestrator",
    default_args=default_args,
    description="Ingest Steam metadata into GCS, then rebuild BigQuery marts",
    schedule_interval=SCHEDULE,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=["steam", "elt"],
) as dag:

    ingest = CloudRunExecuteJobOperator(
        task_id="ingest_steam_metadata",
        project_id=GCP_PROJECT,
        region=GCP_REGION,
        job_name="steam-ingest-job",
        gcp_conn_id=GCP_CONN_ID,
    )

    transform = CloudRunExecuteJobOperator(
        task_id="rebuild_bigquery_marts",
        project_id=GCP_PROJECT,
        region=GCP_REGION,
        job_name="steam-transform-job",
        gcp_conn_id=GCP_CONN_ID,
    )

    ingest >> transform
