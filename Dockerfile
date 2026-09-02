FROM python:3.12-slim

# Fail fast and stream logs straight to Cloud Logging.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencies first so code edits do not invalidate the install layer.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY config.py state_store.py ingest.py transform.py ./

# Cloud Run has an ephemeral filesystem, so local batch mirroring is pointless
# here; state lives in GCS instead (see state_store.py).
ENV WRITE_LOCAL_BATCHES=false

# Drop root. The job only needs outbound HTTPS and a writable /app.
RUN useradd --create-home --uid 1001 steampulse \
    && chown -R steampulse:steampulse /app
USER steampulse

# Default entrypoint is ingestion; the transform job overrides this with
#   CMD ["python", "transform.py"]
CMD ["python", "ingest.py"]
