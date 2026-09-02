"""Build stg_games and the marts in BigQuery, gated by data-quality checks.

The lake holds one snapshot per game per run, so every projection needs an
explicit tiebreak or the output changes between rebuilds.
"""
import logging
import sys

from google.cloud import bigquery

import config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("transform")


INGESTED_AT = "ingested_at"


def ensure_raw_schema(client):
    """Add ingested_at to the external table if missing. Idempotent, additive."""
    table = client.get_table(config.RAW_TABLE_FQN)
    names = {f.name for f in table.schema}
    if INGESTED_AT in names:
        log.info("Raw table already exposes %s", INGESTED_AT)
        return True

    log.info("Adding %s to %s", INGESTED_AT, config.RAW_TABLE_FQN)
    table.schema = list(table.schema) + [
        bigquery.SchemaField(INGESTED_AT, "STRING", mode="NULLABLE")
    ]
    try:
        client.update_table(table, ["schema"])
        log.info("Raw table schema updated")
        return True
    except Exception as exc:
        log.warning("Could not update raw schema (%s); dedup will use appid order", exc)
        return False


def stg_games_sql(has_ingested_at):
    order_by = (
        "SAFE_CAST(ingested_at AS TIMESTAMP) DESC NULLS LAST, name"
        if has_ingested_at
        else "name"
    )
    ingested_col = (
        "SAFE_CAST(ingested_at AS TIMESTAMP) AS ingested_at"
        if has_ingested_at
        else "CAST(NULL AS TIMESTAMP) AS ingested_at"
    )

    return f"""
    CREATE OR REPLACE TABLE `{config.STG_GAMES_FQN}`
    AS
    SELECT
      steam_id AS appid,
      name,
      ROUND(price_overview.final / 100.0, 2) AS price,
      is_free,
      -- ORDER BY keeps the pick stable across rebuilds.
      ARRAY(
        SELECT description FROM UNNEST(genres) ORDER BY description
      ) AS genres,
      (
        SELECT description FROM UNNEST(genres) ORDER BY description LIMIT 1
      ) AS primary_genre,
      metacritic.score AS metacritic,
      recommendations.total AS total_reviews,
      SAFE.PARSE_DATE('%d %b, %Y', release_date.date) AS release_date,
      (SELECT p FROM UNNEST(publishers) AS p ORDER BY p LIMIT 1) AS publisher,
      header_image,
      {ingested_col}
    FROM `{config.RAW_TABLE_FQN}`
    WHERE steam_id IS NOT NULL
      AND name IS NOT NULL
      AND (price_overview IS NULL OR price_overview.final >= 0)
    QUALIFY ROW_NUMBER() OVER (
      PARTITION BY steam_id ORDER BY {order_by}
    ) = 1
    """


MART_TRENDS_SQL = f"""
CREATE OR REPLACE TABLE `{config.MART_TRENDS_FQN}` AS
SELECT
  primary_genre AS genre,
  COUNT(*) AS total_games,
  ROUND(AVG(price), 2) AS avg_price,
  ROUND(AVG(metacritic), 1) AS avg_rating,
  SUM(total_reviews) AS total_reviews,
  COUNTIF(is_free) AS free_games
FROM `{config.STG_GAMES_FQN}`
WHERE primary_genre IS NOT NULL
GROUP BY primary_genre
ORDER BY total_games DESC
"""

# rating_stddev = catalogue consistency; low spread means a studio ships reliably.
MART_PUBLISHERS_SQL = f"""
CREATE OR REPLACE TABLE `{config.MART_PUBLISHERS_FQN}` AS
SELECT
  publisher,
  COUNT(*) AS total_games,
  ROUND(AVG(metacritic), 1) AS avg_rating,
  ROUND(STDDEV_SAMP(metacritic), 2) AS rating_stddev,
  COUNTIF(metacritic >= 75) AS high_quality_games,
  COUNTIF(metacritic IS NOT NULL) AS rated_games,
  SUM(total_reviews) AS total_reviews,
  ROUND(AVG(price), 2) AS avg_price
FROM `{config.STG_GAMES_FQN}`
WHERE publisher IS NOT NULL AND publisher != ''
GROUP BY publisher
ORDER BY total_games DESC
"""


# --------------------------------------------------------------------------
# Data quality
# --------------------------------------------------------------------------
# Each check projects a `failures` count; anything above zero aborts the build.
QUALITY_CHECKS = [
    (
        "stg_games.appid is unique",
        f"""SELECT COUNT(*) AS failures FROM (
              SELECT appid FROM `{config.STG_GAMES_FQN}`
              GROUP BY appid HAVING COUNT(*) > 1
            )""",
    ),
    (
        "stg_games.appid is never null",
        f"SELECT COUNTIF(appid IS NULL) AS failures FROM `{config.STG_GAMES_FQN}`",
    ),
    (
        "stg_games.price is never negative",
        f"SELECT COUNTIF(price < 0) AS failures FROM `{config.STG_GAMES_FQN}`",
    ),
    (
        "stg_games.metacritic is within 0-100",
        f"""SELECT COUNTIF(metacritic IS NOT NULL AND (metacritic < 0 OR metacritic > 100))
                AS failures FROM `{config.STG_GAMES_FQN}`""",
    ),
    (
        "stg_games.release_date is not in the future",
        f"""SELECT COUNTIF(release_date > CURRENT_DATE()) AS failures
            FROM `{config.STG_GAMES_FQN}`""",
    ),
    (
        "mart_trends.genre is unique",
        f"""SELECT COUNT(*) AS failures FROM (
              SELECT genre FROM `{config.MART_TRENDS_FQN}`
              GROUP BY genre HAVING COUNT(*) > 1
            )""",
    ),
]

# Below this, something upstream is broken; do not publish.
MIN_EXPECTED_ROWS = 1000


def scalar(client, sql, field):
    return list(client.query(sql).result())[0][field]


def run_quality_checks(client):
    failed = []
    for name, sql in QUALITY_CHECKS:
        count = scalar(client, sql, "failures")
        if count:
            log.error("FAIL  %s (%s offending rows)", name, count)
            failed.append(name)
        else:
            log.info("PASS  %s", name)
    return failed


def run():
    client = bigquery.Client(project=config.PROJECT_ID)

    has_ingested_at = ensure_raw_schema(client)

    log.info("Rebuilding stg_games...")
    client.query(stg_games_sql(has_ingested_at)).result()

    row_count = scalar(
        client, f"SELECT COUNT(*) AS c FROM `{config.STG_GAMES_FQN}`", "c"
    )
    log.info("stg_games: %s rows", row_count)
    if row_count < MIN_EXPECTED_ROWS:
        raise RuntimeError(
            f"stg_games has only {row_count} rows (expected >= {MIN_EXPECTED_ROWS}); "
            "refusing to rebuild marts on a suspect load"
        )

    log.info("Rebuilding mart_trends...")
    client.query(MART_TRENDS_SQL).result()
    log.info("Rebuilding mart_publishers...")
    client.query(MART_PUBLISHERS_SQL).result()

    log.info("Running data quality checks...")
    failed = run_quality_checks(client)
    if failed:
        raise RuntimeError(f"{len(failed)} data quality check(s) failed: {failed}")

    log.info("Transform complete. stg_games=%s rows", row_count)


if __name__ == "__main__":
    run()
