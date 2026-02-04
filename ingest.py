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
        blob.upload_from_string(json.dumps(batch_data), content_type='application/json')
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

def get_relevant_game_ids(target_count):
    # Check if we already have the IDs from a previous run
    if os.path.exists(DISCOVERY_FILE):
        print(f"📂 Found existing game list ({DISCOVERY_FILE}). Loading...")
        with open(DISCOVERY_FILE, 'r') as f:
            ids = json.load(f)
        if len(ids) >= target_count:
            print(f"✅ Loaded {len(ids)} IDs. Skipping discovery.")
            return ids[:target_count]

    unique_ids = []
    page = 1
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

    print(f"🕵️‍♂️ Starting Discovery for {target_count} games...")

    while len(unique_ids) < target_count:
        url = f"https://store.steampowered.com/search/?sort_by=Reviews_DESC&category1=998&page={page}"
        try:
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code != 200:
                time.sleep(2)
                continue
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            rows = soup.find_all(attrs={"data-ds-appid": True})
            
            if not rows: break

            for row in rows:
                app_ids = row['data-ds-appid'].split(',')
                for app_id in app_ids:
                    aid = int(app_id)
                    if aid not in unique_ids:
                        unique_ids.append(aid)
            
            print(f"   Page {page}: Total found {len(unique_ids)}")
            page += 1
            time.sleep(1) # Be polite

        except Exception as e:
            print(f"❌ Error on page {page}: {e}")
            time.sleep(5)

    # SAVE THE LIST IMMEDIATELY
    with open(DISCOVERY_FILE, 'w') as f:
        json.dump(unique_ids, f)
    print(f"📝 Saved {len(unique_ids)} IDs to {DISCOVERY_FILE}")
    
    return unique_ids[:target_count]

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