"""Tests for the SQL the transform layer generates.

These assert on SQL text rather than hitting BigQuery, so they run in CI with
no credentials. They exist to stop the non-determinism regressions coming back.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config  # noqa: E402
import transform  # noqa: E402


def test_dedup_orders_by_ingestion_time_not_the_partition_key():
    """The original bug: ORDER BY steam_id inside PARTITION BY steam_id.

    Every row tied, so BigQuery kept an arbitrary snapshot per game and the
    result could change between rebuilds.
    """
    sql = transform.stg_games_sql(has_ingested_at=True)
    assert "PARTITION BY steam_id ORDER BY SAFE_CAST(ingested_at AS TIMESTAMP) DESC" in sql
    assert "ORDER BY steam_id" not in sql


def test_dedup_has_a_stable_fallback_without_ingested_at():
    sql = transform.stg_games_sql(has_ingested_at=False)
    assert "PARTITION BY steam_id ORDER BY name" in sql
    assert "ORDER BY steam_id" not in sql


def test_genre_and_publisher_picks_are_deterministic():
    """LIMIT 1 over UNNEST with no ORDER BY returns an arbitrary element."""
    sql = transform.stg_games_sql(has_ingested_at=True)
    assert "FROM UNNEST(genres) ORDER BY description LIMIT 1" in sql
    assert "FROM UNNEST(publishers) AS p ORDER BY p LIMIT 1" in sql


def test_negative_prices_are_filtered_before_they_reach_the_mart():
    sql = transform.stg_games_sql(has_ingested_at=True)
    assert "price_overview.final >= 0" in sql


def test_publisher_mart_exposes_consistency_not_just_average():
    assert "STDDEV_SAMP(metacritic)" in transform.MART_PUBLISHERS_SQL
    assert "high_quality_games" in transform.MART_PUBLISHERS_SQL


def test_quality_checks_cover_the_documented_guarantees():
    names = [name for name, _ in transform.QUALITY_CHECKS]
    assert any("unique" in n and "appid" in n for n in names)
    assert any("negative" in n for n in names)
    # Every check must project a column literally named `failures`.
    for name, sql in transform.QUALITY_CHECKS:
        assert "failures" in sql, name


def test_all_sql_targets_the_configured_project():
    for sql in (
        transform.stg_games_sql(True),
        transform.MART_TRENDS_SQL,
        transform.MART_PUBLISHERS_SQL,
    ):
        assert config.PROJECT_ID in sql


def test_min_row_guard_is_set():
    assert transform.MIN_EXPECTED_ROWS > 0
