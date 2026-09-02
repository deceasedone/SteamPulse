"""Durable pipeline state in GCS, with a local-filesystem fallback.

Cloud Run discards its filesystem between executions, so a local checkpoint
means every run re-crawls all 10k games from scratch.
"""
import json
import logging
import os

import config

log = logging.getLogger(__name__)


class StateStore:
    def __init__(self, bucket_name=None, prefix=None, local_dir="."):
        self.bucket_name = bucket_name or config.BUCKET_NAME
        self.prefix = (prefix or config.STATE_PREFIX).strip("/")
        self.local_dir = local_dir
        self._bucket = None
        self._gcs_ok = True

    # -- GCS plumbing -----------------------------------------------------
    @property
    def bucket(self):
        if self._bucket is None and self._gcs_ok:
            try:
                from google.cloud import storage

                self._bucket = storage.Client(project=config.PROJECT_ID).bucket(
                    self.bucket_name
                )
            except Exception as exc:
                log.warning("GCS unavailable, falling back to local state: %s", exc)
                self._gcs_ok = False
        return self._bucket

    def _blob(self, name):
        bucket = self.bucket
        return bucket.blob(f"{self.prefix}/{name}") if bucket else None

    def _local_path(self, name):
        return os.path.join(self.local_dir, name)

    # -- Public API -------------------------------------------------------
    def read_json(self, name, default=None):
        """Read state, preferring GCS and falling back to a local file."""
        blob = self._blob(name)
        if blob is not None:
            try:
                if blob.exists():
                    return json.loads(blob.download_as_text())
            except Exception as exc:
                log.warning("Could not read %s from GCS: %s", name, exc)

        path = self._local_path(name)
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as fh:
                    return json.load(fh)
            except (OSError, json.JSONDecodeError) as exc:
                log.warning("Could not read local %s: %s", path, exc)
        return default

    def write_json(self, name, payload):
        """Write state to GCS and mirror locally. Never raises."""
        body = json.dumps(payload)

        blob = self._blob(name)
        if blob is not None:
            try:
                blob.upload_from_string(body, content_type="application/json")
            except Exception as exc:
                log.warning("Could not persist %s to GCS: %s", name, exc)

        try:
            with open(self._local_path(name), "w", encoding="utf-8") as fh:
                fh.write(body)
        except OSError as exc:
            log.debug("Could not mirror %s locally: %s", name, exc)
