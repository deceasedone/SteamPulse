import requests
import json
import os
from dotenv import load_dotenv

# Load variables from .env file
load_dotenv()

API_KEY = os.getenv("STEAM_API_KEY")

def fetch_full_app_list():
    if not API_KEY:
        print("❌ Error: STEAM_API_KEY not found in .env file.")
        return None

    url = "https://api.steampowered.com/IStoreService/GetAppList/v1/"
    all_apps = []
    last_appid = 0
    more_items = True

    print(f"🚀 Starting fetch via IStoreService (Key ending in ...{API_KEY[-4:]})...")

    while more_items:
        params = {
            "key": API_KEY,
            "include_games": "true",
            "include_dlc": "false",
            "include_software": "false",
            "max_results": 50000,
            "last_appid": last_appid
        }

        try:
            resp = requests.get(url, params=params, timeout=30)
            
            if resp.status_code == 403:
                print("❌ 403 Forbidden: API Key is invalid or has no permissions.")
                return None
            if resp.status_code != 200:
                print(f"❌ Error {resp.status_code}: {resp.text}")
                return None

            data = resp.json()
            apps_batch = data.get("response", {}).get("apps", [])

            if not apps_batch:
                more_items = False
            else:
                all_apps.extend(apps_batch)
                last_appid = apps_batch[-1]["appid"]
                print(f"   Fetched {len(apps_batch)} apps... (Total: {len(all_apps)})")
                
                # If we got fewer than 50k, we reached the end
                if len(apps_batch) < 50000:
                    more_items = False
                    
        except Exception as e:
            print(f"🔥 Request failed: {e}")
            break

    # Reformat to match the structure expected by ingest.py
    structured_data = {
        "applist": {
            "apps": [{"appid": a["appid"], "name": a["name"]} for a in all_apps]
        }
    }

    return structured_data

if __name__ == "__main__":
    data = fetch_full_app_list()
    if data and data["applist"]["apps"]:
        with open("steam_app_list.json", "w", encoding="utf-8") as f:
            json.dump(data, f)
        print(f"✅ Saved steam_app_list.json ({len(data['applist']['apps'])} games)")
    else:
        print("⚠️ No data saved.")