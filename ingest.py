"""Discover Steam app ids, fetch their metadata, land NDJSON batches in GCS.

Checkpoint and discovered-id state live in GCS so a run on ephemeral compute
resumes where the previous one stopped.
"""
import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

import config
from state_store import StateStore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("ingest")

CHECKPOINT_FILE = "ingest_state.json"
DISCOVERY_FILE = "discovered_ids.json"

SEARCH_URL = "https://store.steampowered.com/search/"
APPDETAILS_URL = "https://store.steampowered.com/api/appdetails"


class RateLimited(Exception):
    """Raised on HTTP 429 so the caller can retry the same id."""

    def __init__(self, app_id):
        super().__init__(f"rate limited on app {app_id}")
        self.app_id = app_id


def build_session():
    """A session with connection pooling and transport-level retries."""
    session = requests.Session()
    retry = Retry(
        total=config.MAX_RETRIES,
        backoff_factor=1.5,
        status_forcelist=(500, 502, 503, 504),
        allowed_methods=frozenset(["GET"]),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    session.mount("https://", adapter)
    session.headers.update({"User-Agent": config.USER_AGENT})
    return session


# --------------------------------------------------------------------------
# Discovery
# --------------------------------------------------------------------------
def _scrape_appids(session, sort_by, page):
    """Return the app ids listed on one storefront search page."""
    resp = session.get(
        SEARCH_URL,
        params={"sort_by": sort_by, "category1": 998, "page": page},
        timeout=config.REQUEST_TIMEOUT,
    )
    if resp.status_code != 200:
        log.warning(
            "Search page %s (%s) returned HTTP %s", page, sort_by, resp.status_code
        )
        return None

    soup = BeautifulSoup(resp.text, "html.parser")
    ids = []
    for row in soup.find_all(attrs={"data-ds-appid": True}):
        for raw in row["data-ds-appid"].split(","):
            try:
                ids.append(int(raw))
            except ValueError:
                continue
    return ids


def discover_new_releases(session, known):
    """Scan the newest and most-reviewed pages for unseen ids."""
    found = []
    seen = set(known)

    for sort_by in ("Released_DESC", "Reviews_DESC"):
        for page in range(1, config.NEW_RELEASE_SCAN_PAGES + 1):
            try:
                ids = _scrape_appids(session, sort_by, page)
            except requests.RequestException as exc:
                log.warning("Scan failed for %s page %s: %s", sort_by, page, exc)
                time.sleep(5)
                continue

            if ids is None:
                time.sleep(2)
                continue
            if not ids:
                break

            for app_id in ids:
                if app_id not in seen:
                    seen.add(app_id)
                    found.append(app_id)
            time.sleep(1)

    return found


def get_relevant_game_ids(state, session, target_count):
    known = state.read_json(DISCOVERY_FILE, default=[]) or []
    known_set = set(known)
    log.info("Loaded %s known app ids", len(known))

    log.info("Scanning first %s pages for new releases...", config.NEW_RELEASE_SCAN_PAGES)
    new_ids = discover_new_releases(session, known_set)
    if new_ids:
        log.info("Found %s new app id(s)", len(new_ids))
        known.extend(new_ids)
        known_set.update(new_ids)
    else:
        log.info("No new releases since last run")

    if len(known) < target_count:
        log.info("Below target (%s/%s), running full discovery", len(known), target_count)
        page = 1
        stalled = 0
        while len(known) < target_count and stalled < 3:
            try:
                ids = _scrape_appids(session, "Reviews_DESC", page)
            except requests.RequestException as exc:
                log.warning("Discovery page %s failed: %s", page, exc)
                time.sleep(5)
                stalled += 1
                continue

            if ids is None:
                time.sleep(2)
                stalled += 1
                continue
            if not ids:
                break

            added = 0
            for app_id in ids:
                if app_id not in known_set:
                    known_set.add(app_id)
                    known.append(app_id)
                    added += 1

            # Nothing new on this page: stop rather than paging forever.
            stalled = stalled + 1 if added == 0 else 0
            log.info("Discovery page %s: +%s (total %s)", page, added, len(known))
            page += 1
            time.sleep(1)

    state.write_json(DISCOVERY_FILE, known)
    log.info("Persisted %s app ids", len(known))
    return known


# --------------------------------------------------------------------------
# Fetch + land
# --------------------------------------------------------------------------
def to_ndjson(records):
    """BigQuery reads NEWLINE_DELIMITED_JSON: one object per line."""
    return "\n".join(json.dumps(r, ensure_ascii=False) for r in records)


def save_batch_locally(records, batch_index):
    if not config.WRITE_LOCAL_BATCHES:
        return
    os.makedirs(config.LOCAL_DATA_DIR, exist_ok=True)
    path = os.path.join(config.LOCAL_DATA_DIR, f"batch_{batch_index}.json")
    try:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(to_ndjson(records))
    except OSError as exc:
        log.warning("Local write failed for batch %s: %s", batch_index, exc)


def upload_batch_to_gcs(bucket, records, batch_index):
    if bucket is None:
        return False
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    name = f"{config.RAW_PREFIX}/{date_str}/batch_{batch_index}.json"
    try:
        bucket.blob(name).upload_from_string(
            to_ndjson(records), content_type="application/json"
        )
        log.info("Uploaded %s (%s records)", name, len(records))
        return True
    except Exception as exc:
        log.error("Upload failed for %s: %s (data kept locally)", name, exc)
        return False


def fetch_game(session, app_id):
    """Return the game dict, or None if not a game. Raises RateLimited on 429."""
    resp = session.get(
        APPDETAILS_URL,
        params={"appids": app_id, "cc": config.STEAM_COUNTRY_CODE, "l": "english"},
        timeout=config.REQUEST_TIMEOUT,
    )
    if resp.status_code == 429:
        raise RateLimited(app_id)
    resp.raise_for_status()

    payload = resp.json()
    entry = payload.get(str(app_id)) if payload else None
    if not entry or not entry.get("success"):
        return None

    game = entry.get("data") or {}
    if game.get("type") != "game":
        return None

    game["ingested_at"] = datetime.now(timezone.utc).isoformat()
    game["steam_id"] = app_id
    return game


def _get_bucket():
    try:
        from google.cloud import storage

        return storage.Client(project=config.PROJECT_ID).bucket(config.BUCKET_NAME)
    except Exception as exc:
        log.error("GCS client unavailable: %s (batches kept locally only)", exc)
        return None


def fetch_details_and_store(state, session, all_ids):
    checkpoint = state.read_json(CHECKPOINT_FILE, default={}) or {}
    start_index = checkpoint.get("last_index", 0)
    if start_index >= len(all_ids):
        log.info("Checkpoint (%s) is past the id list; starting over", start_index)
        start_index = 0
    if start_index:
        log.info("Resuming from index %s of %s", start_index, len(all_ids))

    bucket = _get_bucket()
    batch = []
    stats = {"ok": 0, "skipped": 0, "failed": 0, "rate_limited": 0}
    index = start_index

    while index < len(all_ids):
        app_id = all_ids[index]
        try:
            game = fetch_game(session, app_id)
            if game is not None:
                batch.append(game)
                stats["ok"] += 1
            else:
                stats["skipped"] += 1

        except RateLimited:
            stats["rate_limited"] += 1
            log.warning(
                "Rate limited at index %s; sleeping %ss then retrying the same id",
                index,
                config.RATE_LIMIT_SLEEP,
            )
            time.sleep(config.RATE_LIMIT_SLEEP)
            continue  # deliberately does NOT advance - retry this app id

        except (requests.RequestException, ValueError) as exc:
            # Logged, not swallowed: an outage must not look like "no new games".
            stats["failed"] += 1
            log.warning("app %s failed: %s", app_id, exc)

        index += 1

        if len(batch) >= config.BATCH_SIZE:
            save_batch_locally(batch, index)
            upload_batch_to_gcs(bucket, batch, index)
            batch = []
            state.write_json(CHECKPOINT_FILE, {"last_index": index})
            log.info(
                "Progress %s/%s | ok=%s skipped=%s failed=%s",
                index,
                len(all_ids),
                stats["ok"],
                stats["skipped"],
                stats["failed"],
            )
            time.sleep(config.BATCH_SLEEP)

    if batch:
        save_batch_locally(batch, index)
        upload_batch_to_gcs(bucket, batch, index)

    state.write_json(CHECKPOINT_FILE, {"last_index": len(all_ids)})
    log.info(
        "Ingestion complete: ok=%s skipped=%s failed=%s rate_limited=%s",
        stats["ok"],
        stats["skipped"],
        stats["failed"],
        stats["rate_limited"],
    )

    # Fail the job rather than report success on an effectively empty load.
    attempted = stats["ok"] + stats["skipped"] + stats["failed"]
    if attempted and stats["failed"] / attempted > 0.5:
        raise RuntimeError(
            f"{stats['failed']}/{attempted} fetches failed - aborting as unhealthy"
        )
    return stats


def main():
    parser = argparse.ArgumentParser(description="Ingest Steam game metadata.")
    parser.add_argument(
        "--target", type=int, default=config.TARGET_GAMES, help="games to discover"
    )
    parser.add_argument("--reset", action="store_true", help="ignore saved checkpoint")
    parser.add_argument(
        "--limit", type=int, default=0, help="stop after N ids (smoke testing)"
    )
    args = parser.parse_args()

    state = StateStore()
    if args.reset:
        log.info("--reset: clearing checkpoint")
        state.write_json(CHECKPOINT_FILE, {"last_index": 0})

    session = build_session()
    ids = get_relevant_game_ids(state, session, args.target)
    if args.limit:
        ids = ids[: args.limit]
        log.info("--limit: processing only the first %s ids", len(ids))
    fetch_details_and_store(state, session, ids)


if __name__ == "__main__":
    main()
