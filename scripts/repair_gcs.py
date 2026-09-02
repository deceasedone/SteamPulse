"""One-off maintenance: convert legacy JSON-array batches in GCS to NDJSON.

Historically the ingester wrote a JSON array locally and NDJSON to the cloud;
any batch uploaded from the local mirror landed in the wrong format and the
BigQuery external table skipped it. ingest.py now writes NDJSON everywhere, so
this script only exists to fix objects written before that change.

Run it once, confirm "Repaired: 0" on a second run, and it can be deleted.

    python scripts/repair_gcs.py --dry-run
    python scripts/repair_gcs.py
"""
import argparse
import json
import logging
import os
import sys

from google.cloud import storage

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import config  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)-8s %(message)s")
log = logging.getLogger("repair")


def repair_all_in_gcs(dry_run=False):
    bucket = storage.Client(project=config.PROJECT_ID).bucket(config.BUCKET_NAME)
    blobs = [
        b
        for b in bucket.list_blobs(prefix=f"{config.RAW_PREFIX}/")
        if b.name.endswith(".json")
    ]
    log.info("Scanning %s objects under %s/", len(blobs), config.RAW_PREFIX)

    fixed = already_ok = errors = 0
    for blob in blobs:
        try:
            content = blob.download_as_text()
            if not content.lstrip().startswith("["):
                already_ok += 1
                continue

            records = json.loads(content)
            ndjson = "\n".join(json.dumps(r, ensure_ascii=False) for r in records)
            if dry_run:
                log.info("WOULD REPAIR %s (%s records)", blob.name, len(records))
            else:
                blob.upload_from_string(ndjson, content_type="application/json")
                log.info("Repaired %s (%s records)", blob.name, len(records))
            fixed += 1
        except Exception as exc:
            log.warning("Failed on %s: %s", blob.name, exc)
            errors += 1

    log.info("Repaired: %s | Already NDJSON: %s | Errors: %s", fixed, already_ok, errors)
    return errors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report, do not write")
    args = parser.parse_args()
    sys.exit(1 if repair_all_in_gcs(args.dry_run) else 0)
