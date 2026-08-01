from google.cloud import bigquery

PROJECT_ID = "steampulse-data-eng"

STG_GAMES_SQL = """
CREATE OR REPLACE TABLE `steampulse-data-eng.dbt_gsinha.stg_games` AS
SELECT
  steam_id AS appid,
  name,
  ROUND(price_overview.final / 100.0, 2) AS price,
  is_free,
  ARRAY(SELECT description FROM UNNEST(genres)) AS genres,
  (SELECT description FROM UNNEST(genres) LIMIT 1) AS primary_genre,
  metacritic.score AS metacritic,
  recommendations.total AS total_reviews,
  SAFE.PARSE_DATE('%d %b, %Y', release_date.date) AS release_date,
  (SELECT publisher FROM UNNEST(publishers) AS publisher LIMIT 1) AS publisher,
  header_image
FROM `steampulse-data-eng.steam_raw.gcs_raw_json`
WHERE steam_id IS NOT NULL AND name IS NOT NULL
QUALIFY ROW_NUMBER() OVER (PARTITION BY steam_id ORDER BY steam_id) = 1
"""

MART_TRENDS_SQL = """
CREATE OR REPLACE TABLE `steampulse-data-eng.dbt_gsinha.mart_trends` AS
SELECT
  primary_genre AS genre,
  COUNT(*) AS total_games,
  ROUND(AVG(price), 2) AS avg_price,
  ROUND(AVG(metacritic), 1) AS avg_rating
FROM `steampulse-data-eng.dbt_gsinha.stg_games`
WHERE primary_genre IS NOT NULL
GROUP BY primary_genre
ORDER BY total_games DESC
"""

def run():
    client = bigquery.Client(project=PROJECT_ID)
    print("🔨 Rebuilding stg_games...")
    client.query(STG_GAMES_SQL).result()
    print("🔨 Rebuilding mart_trends...")
    client.query(MART_TRENDS_SQL).result()
    count = list(client.query(
        "SELECT COUNT(*) as c FROM `steampulse-data-eng.dbt_gsinha.stg_games`"
    ).result())[0].c
    print(f"✅ Done. stg_games now has {count} rows.")

if __name__ == "__main__":
    run()