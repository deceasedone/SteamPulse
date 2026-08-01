import requests
import json
import time
import os
from datetime import datetime
from bs4 import BeautifulSoup
from google.cloud import storage

# --- Configuration ---
PROJECT_ID = "steampulse-data-eng"
BUCKET_NAME = "steampulse-raw-lake"
CHECKPOINT_FILE = "ingest_state.json"
DISCOVERY_FILE = "discovered_ids.json"  # New: Saves the list of 10k IDs
LOCAL_DATA_DIR = "data"                 # New: Saves files locally first
TARGET_GAMES = 10000
BATCH_SIZE = 10 
BATCH_SLEEP = 2

# Ensure local data directory exists
os.makedirs(LOCAL_DATA_DIR, exist_ok=True)

def upload_batch_to_gcs(batch_data, batch_index):
    """Uploads data to GCS, but handles errors gracefully."""
    try:
        client = storage.Client(project=PROJECT_ID)
        bucket = client.bucket(BUCKET_NAME)
        date_str = datetime.now().strftime('%Y-%m-%d')
        filename = f"raw_layer/{date_str}/batch_{batch_index}.json"
        
        blob = bucket.blob(filename)
        ndjson_data = "\n".join(json.dumps(record) for record in batch_data)
        blob.upload_from_string(ndjson_data, content_type='application/json')
        print(f"☁️  Synced batch {batch_index} to Cloud.")
    except Exception as e:
        print(f"⚠️  Cloud Upload Failed: {e}")
        print("    (Don't worry, data is safe locally in the 'data/' folder)")

def save_batch_locally(batch_data, batch_index):
    """Saves data to your hard drive first."""
    filename = os.path.join(LOCAL_DATA_DIR, f"batch_{batch_index}.json")
    with open(filename, 'w') as f:
        json.dump(batch_data, f)
    print(f"💾 Saved batch {batch_index} locally.")

NEW_RELEASE_SCAN_PAGES = 5  # pages to check per sort mode, every run

def discover_new_releases(existing_ids, headers):
    """Scans newest AND most-reviewed pages — catches new releases plus older popular titles the original crawl missed."""
    found_new = []
    for sort_by in ["Released_DESC", "Reviews_DESC"]:
        page = 1
        while page <= NEW_RELEASE_SCAN_PAGES:
            url = f"https://store.steampowered.com/search/?sort_by={sort_by}&category1=998&page={page}"
            try:
                resp = requests.get(url, headers=headers, timeout=10)
                if resp.status_code != 200:
                    time.sleep(2)
                    continue
                soup = BeautifulSoup(resp.text, 'html.parser')
                rows = soup.find_all(attrs={"data-ds-appid": True})
                if not rows:
                    break
                for row in rows:
                    for app_id in row['data-ds-appid'].split(','):
                        aid = int(app_id)
                        if aid not in existing_ids and aid not in found_new:
                            found_new.append(aid)
                page += 1
                time.sleep(1)
            except Exception as e:
                print(f"❌ Error scanning {sort_by} page {page}: {e}")
                time.sleep(5)
    return found_new


def get_relevant_game_ids(target_count):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

    existing_ids = []
    if os.path.exists(DISCOVERY_FILE):
        print(f"📂 Found existing game list ({DISCOVERY_FILE}). Loading...")
        with open(DISCOVERY_FILE, 'r') as f:
            existing_ids = json.load(f)
        print(f"✅ Loaded {len(existing_ids)} known IDs.")

    # ALWAYS check for new releases, even after target_count was hit previously
    print(f"🕵️‍♂️ Scanning for new releases (last {NEW_RELEASE_SCAN_PAGES} pages)...")
    new_ids = discover_new_releases(existing_ids, headers)
    if new_ids:
        print(f"🆕 Found {len(new_ids)} new game(s): {new_ids}")
        existing_ids.extend(new_ids)
    else:
        print("   No new releases found since last run.")

    # First-ever run: still need full discovery to reach target_count
    if len(existing_ids) < target_count:
        print(f"🕵️‍♂️ Below target ({len(existing_ids)}/{target_count}). Running full discovery...")
        page = 1
        while len(existing_ids) < target_count:
            url = f"https://store.steampowered.com/search/?sort_by=Reviews_DESC&category1=998&page={page}"
            try:
                resp = requests.get(url, headers=headers, timeout=10)
                if resp.status_code != 200:
                    time.sleep(2)
                    continue
                soup = BeautifulSoup(resp.text, 'html.parser')
                rows = soup.find_all(attrs={"data-ds-appid": True})
                if not rows:
                    break
                for row in rows:
                    for app_id in row['data-ds-appid'].split(','):
                        aid = int(app_id)
                        if aid not in existing_ids:
                            existing_ids.append(aid)
                print(f"   Page {page}: Total {len(existing_ids)}")
                page += 1
                time.sleep(1)
            except Exception as e:
                print(f"❌ Error on page {page}: {e}")
                time.sleep(5)

    with open(DISCOVERY_FILE, 'w') as f:
        json.dump(existing_ids, f)
    print(f"📝 Saved {len(existing_ids)} total IDs to {DISCOVERY_FILE}")

    return existing_ids

def fetch_details_and_store(all_ids):
    start_index = 0
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            start_index = json.load(f).get('last_index', 0)
            print(f"🔄 Resuming from Game #{start_index}...")

    current_batch = []
    
    for i in range(start_index, len(all_ids)):
        app_id = all_ids[i]
        
        # Simple progress bar
        print(f"Processing {i+1}/{len(all_ids)} (ID: {app_id})...", end='\r')

        try:
            r = requests.get(f"https://store.steampowered.com/api/appdetails?appids={app_id}&cc=IN&l=english", timeout=10)
            if r.status_code == 429:
                print(f"\n🛑 Rate limit. Sleeping 60s...")
                time.sleep(60)
                continue

            data = r.json()
            if data and str(app_id) in data and data[str(app_id)]['success']:
                game = data[str(app_id)]['data']
                if game.get('type') == 'game':
                    game['ingested_at'] = datetime.now().isoformat()
                    game['steam_id'] = app_id
                    current_batch.append(game)
        
        except Exception:
            pass # Skip broken games

        # Batch Save
        if len(current_batch) >= BATCH_SIZE:
            # 1. Save Locally FIRST (Safety)
            save_batch_locally(current_batch, i)
            
            # 2. Try Cloud Upload
            upload_batch_to_gcs(current_batch, i)
            
            current_batch = []
            with open(CHECKPOINT_FILE, 'w') as f:
                json.dump({'last_index': i + 1}, f)
            
            time.sleep(BATCH_SLEEP)

    if current_batch:
        save_batch_locally(current_batch, "final")
        upload_batch_to_gcs(current_batch, "final")

if __name__ == "__main__":
    top_ids = get_relevant_game_ids(TARGET_GAMES)
    fetch_details_and_store(top_ids)