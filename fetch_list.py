"""Fetch the full Steam app list via IStoreService.

Optional helper: ingest.py discovers ids by scraping the storefront search
pages, which needs no API key. This script is the authenticated alternative and
requires STEAM_API_KEY in .env.
"""
import json
import logging
import sys

import requests

import config

logging.basicConfig(level=logging.INFO, format="%(levelname)-8s %(message)s")
log = logging.getLogger("fetch_list")

APP_LIST_URL = "https://api.steampowered.com/IStoreService/GetAppList/v1/"
PAGE_SIZE = 50000


def fetch_full_app_list():
    if not config.STEAM_API_KEY:
        log.error("STEAM_API_KEY not set (add it to .env)")
        return None

    all_apps = []
    last_appid = 0

    log.info("Fetching app list via IStoreService...")
    while True:
        params = {
            "key": config.STEAM_API_KEY,
            "include_games": "true",
            "include_dlc": "false",
            "include_software": "false",
            "max_results": PAGE_SIZE,
            "last_appid": last_appid,
        }
        try:
            resp = requests.get(APP_LIST_URL, params=params, timeout=30)
        except requests.RequestException as exc:
            log.error("Request failed: %s", exc)
            return None

        if resp.status_code == 403:
            log.error("403 Forbidden: the API key is invalid or lacks permission")
            return None
        if resp.status_code != 200:
            # Never echo the response body - the request URL carries the key.
            log.error("Unexpected HTTP %s from IStoreService", resp.status_code)
            return None

        batch = resp.json().get("response", {}).get("apps", [])
        if not batch:
            break

        all_apps.extend(batch)
        last_appid = batch[-1]["appid"]
        log.info("Fetched %s apps (total %s)", len(batch), len(all_apps))
        if len(batch) < PAGE_SIZE:
            break

    return {
        "applist": {
            "apps": [{"appid": a["appid"], "name": a["name"]} for a in all_apps]
        }
    }


if __name__ == "__main__":
    data = fetch_full_app_list()
    if not data or not data["applist"]["apps"]:
        log.warning("No data saved")
        sys.exit(1)

    with open("steam_app_list.json", "w", encoding="utf-8") as fh:
        json.dump(data, fh)
    log.info("Saved steam_app_list.json (%s games)", len(data["applist"]["apps"]))
