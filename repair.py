import json
import os
import glob
from google.cloud import storage

# --- Config ---
PROJECT_ID = "steampulse-data-eng"
BUCKET_NAME = "steampulse-raw-lake"
LOCAL_DATA_DIR = "data"

def repair_and_upload():
    # 1. Setup GCS Client
    try:
        client = storage.Client(project=PROJECT_ID)
        bucket = client.bucket(BUCKET_NAME)
    except Exception as e:
        print(f"❌ Auth Error: {e}")
        return

    # 2. Find all local batch files
    files = glob.glob(os.path.join(LOCAL_DATA_DIR, "*.json"))
    print(f"🔧 Found {len(files)} local batches to repair...")

    for filepath in files:
        filename = os.path.basename(filepath)
        
        with open(filepath, 'r') as f:
            try:
                # Read the "Bad" format (JSON Array)
                data = json.load(f)
                
                # Convert to "Good" format (Newline Delimited JSON)
                # This removes the [] wrapper and puts each game on a new line
                ndjson_data = "\n".join([json.dumps(record) for record in data])
                
                # Upload to GCS (Overwriting the bad file)
                # We use a consistent date folder so BigQuery finds it
                # (Assuming you want them all in one place for simplicity)
                blob_name = f"raw_layer/repaired/{filename}" 
                blob = bucket.blob(blob_name)
                
                blob.upload_from_string(ndjson_data, content_type='application/json')
                print(f"✅ Repaired & Uploaded: {filename}")
                
            except Exception as e:
                print(f"⚠️ Failed to process {filename}: {e}")

    print("\n🎉 Repair Complete! Point BigQuery to 'gs://steampulse-raw-lake/raw_layer/repaired/*'")

if __name__ == "__main__":
    repair_and_upload()