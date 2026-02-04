from airflow import DAG
from airflow.providers.google.cloud.operators.cloud_run import CloudRunExecuteJobOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'airflow',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    'steam_ingest_orchestrator',
    default_args=default_args,
    description='Triggers the Cloud Run Job via Airflow',
    schedule_interval='@hourly',
    start_date=datetime(2023, 1, 1),
    catchup=False,
    tags=['steam'],
) as dag:

    trigger_job = CloudRunExecuteJobOperator(
        task_id='trigger_steam_ingest',
        project_id='steampulse-data-eng',
        region='us-central1',
        job_name='steam-ingest-job',
        gcp_conn_id='google_cloud_default' # We need to set this connection in UI
    )

    trigger_job