"""Tests for the ingestion engine.

These cover the behaviours that were previously broken and are easy to
regress: NDJSON output format, retrying rather than skipping on 429, and not
swallowing failures.
"""
import json
import os
import sys

import pytest
import requests

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import ingest  # noqa: E402
from state_store import StateStore  # noqa: E402


class FakeResponse:
    def __init__(self, status_code=200, payload=None, text=""):
        self.status_code = status_code
        self._payload = payload
        self.text = text

    def json(self):
        if self._payload is None:
            raise ValueError("no json")
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")


class FakeSession:
    """Returns queued responses in order and records the calls."""

    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def get(self, url, params=None, timeout=None):
        self.calls.append(params)
        return self._responses.pop(0)


def _game_payload(app_id, name="Test Game", app_type="game"):
    return {str(app_id): {"success": True, "data": {"type": app_type, "name": name}}}


# --------------------------------------------------------------------------
# Output format
# --------------------------------------------------------------------------
def test_to_ndjson_emits_one_object_per_line():
    out = ingest.to_ndjson([{"a": 1}, {"a": 2}, {"a": 3}])
    lines = out.splitlines()
    assert len(lines) == 3
    assert [json.loads(line)["a"] for line in lines] == [1, 2, 3]
    # Critically: not a JSON array. That mismatch is what BigQuery rejected.
    assert not out.lstrip().startswith("[")


def test_to_ndjson_preserves_non_ascii_titles():
    out = ingest.to_ndjson([{"name": "Ōoo"}])
    assert json.loads(out)["name"] == "Ōoo"


def test_local_batches_are_ndjson(tmp_path, monkeypatch):
    monkeypatch.setattr(ingest.config, "LOCAL_DATA_DIR", str(tmp_path))
    monkeypatch.setattr(ingest.config, "WRITE_LOCAL_BATCHES", True)

    ingest.save_batch_locally([{"a": 1}, {"a": 2}], 7)

    content = (tmp_path / "batch_7.json").read_text(encoding="utf-8")
    assert len(content.splitlines()) == 2
    assert not content.lstrip().startswith("[")


# --------------------------------------------------------------------------
# Fetch semantics
# --------------------------------------------------------------------------
def test_fetch_game_stamps_ingested_at_and_id():
    session = FakeSession([FakeResponse(payload=_game_payload(42))])
    game = ingest.fetch_game(session, 42)
    assert game["steam_id"] == 42
    assert game["ingested_at"].endswith("+00:00"), "timestamp must be UTC-aware"


def test_fetch_game_filters_out_dlc():
    session = FakeSession([FakeResponse(payload=_game_payload(42, app_type="dlc"))])
    assert ingest.fetch_game(session, 42) is None


def test_fetch_game_handles_unsuccessful_lookup():
    session = FakeSession([FakeResponse(payload={"42": {"success": False}})])
    assert ingest.fetch_game(session, 42) is None


def test_429_raises_rate_limited_rather_than_returning_none():
    session = FakeSession([FakeResponse(status_code=429)])
    with pytest.raises(ingest.RateLimited):
        ingest.fetch_game(session, 42)


def test_rate_limited_id_is_retried_not_skipped(tmp_path, monkeypatch):
    """The original bug: a 429 advanced the loop, losing that game forever."""
    monkeypatch.setattr(ingest.config, "WRITE_LOCAL_BATCHES", False)
    monkeypatch.setattr(ingest.config, "RATE_LIMIT_SLEEP", 0)
    monkeypatch.setattr(ingest.config, "BATCH_SLEEP", 0)
    monkeypatch.setattr(ingest, "_get_bucket", lambda: None)
    monkeypatch.setattr(ingest.time, "sleep", lambda *_: None)

    session = FakeSession(
        [
            FakeResponse(status_code=429),          # first attempt throttled
            FakeResponse(payload=_game_payload(1)),  # retry of the SAME id
        ]
    )
    state = StateStore(local_dir=str(tmp_path))
    state._gcs_ok = False

    stats = ingest.fetch_details_and_store(state, session, [1])

    assert stats["rate_limited"] == 1
    assert stats["ok"] == 1, "the throttled game must still be ingested"
    assert [c["appids"] for c in session.calls] == [1, 1]


def test_network_failures_are_counted_not_silently_dropped(tmp_path, monkeypatch):
    monkeypatch.setattr(ingest.config, "WRITE_LOCAL_BATCHES", False)
    monkeypatch.setattr(ingest.config, "BATCH_SLEEP", 0)
    monkeypatch.setattr(ingest, "_get_bucket", lambda: None)
    monkeypatch.setattr(ingest.time, "sleep", lambda *_: None)

    class Boom:
        def get(self, *a, **kw):
            raise requests.ConnectionError("network down")

    state = StateStore(local_dir=str(tmp_path))
    state._gcs_ok = False

    # >50% failure rate must abort rather than silently report success.
    with pytest.raises(RuntimeError, match="unhealthy"):
        ingest.fetch_details_and_store(state, Boom(), [1, 2, 3])


def test_checkpoint_is_written_after_the_run(tmp_path, monkeypatch):
    monkeypatch.setattr(ingest.config, "WRITE_LOCAL_BATCHES", False)
    monkeypatch.setattr(ingest.config, "BATCH_SLEEP", 0)
    monkeypatch.setattr(ingest, "_get_bucket", lambda: None)
    monkeypatch.setattr(ingest.time, "sleep", lambda *_: None)

    session = FakeSession([FakeResponse(payload=_game_payload(i)) for i in (1, 2)])
    state = StateStore(local_dir=str(tmp_path))
    state._gcs_ok = False

    ingest.fetch_details_and_store(state, session, [1, 2])
    assert state.read_json("ingest_state.json")["last_index"] == 2


def test_stale_checkpoint_past_end_restarts(tmp_path, monkeypatch):
    monkeypatch.setattr(ingest.config, "WRITE_LOCAL_BATCHES", False)
    monkeypatch.setattr(ingest.config, "BATCH_SLEEP", 0)
    monkeypatch.setattr(ingest, "_get_bucket", lambda: None)
    monkeypatch.setattr(ingest.time, "sleep", lambda *_: None)

    state = StateStore(local_dir=str(tmp_path))
    state._gcs_ok = False
    state.write_json("ingest_state.json", {"last_index": 9999})

    session = FakeSession([FakeResponse(payload=_game_payload(1))])
    stats = ingest.fetch_details_and_store(state, session, [1])
    assert stats["ok"] == 1


# --------------------------------------------------------------------------
# Discovery
# --------------------------------------------------------------------------
SEARCH_HTML = """
<div data-ds-appid="10"></div>
<div data-ds-appid="20,30"></div>
<div data-ds-appid="notanumber"></div>
"""


def test_scrape_parses_comma_separated_and_ignores_garbage():
    session = FakeSession([FakeResponse(text=SEARCH_HTML)])
    assert ingest._scrape_appids(session, "Reviews_DESC", 1) == [10, 20, 30]


def test_discovery_excludes_already_known_ids(monkeypatch):
    monkeypatch.setattr(ingest.time, "sleep", lambda *_: None)
    monkeypatch.setattr(ingest.config, "NEW_RELEASE_SCAN_PAGES", 1)

    session = FakeSession([FakeResponse(text=SEARCH_HTML) for _ in range(2)])
    found = ingest.discover_new_releases(session, {10, 20})
    assert found == [30]
