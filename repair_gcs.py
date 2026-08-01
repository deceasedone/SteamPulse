import json
from google.cloud import storage

PROJECT_ID = "steampulse-data-eng"
BUCKET_NAME = "steampulse-raw-lake"
SKIP_PREFIX = "raw_layer/repaired/"  # already fixed, skip these

def repair_all_in_gcs():
    client = storage.Client(project=PROJECT_ID)
    bucket = client.bucket(BUCKET_NAME)

    blobs = list(bucket.list_blobs(prefix="raw_layer/"))
    print(f"🔎 Found {len(blobs)} total files under raw_layer/")

    fixed_count = 0
    already_ok_count = 0
    error_count = 0

    for blob in blobs:
        if blob.name.startswith(SKIP_PREFIX):
            continue  # already repaired earlier
        if not blob.name.endswith(".json"):
            continue

        try:
            content = blob.download_as_text()
            stripped = content.lstrip()

            if stripped.startswith("["):
                # Broken array format — fix it
                data = json.loads(content)
                ndjson_data = "\n".join(json.dumps(record) for record in data)
                blob.upload_from_string(ndjson_data, content_type='application/json')
                print(f"✅ Repaired in-place: {blob.name}")
                fixed_count += 1
            else:
                already_ok_count += 1

        except Exception as e:
            print(f"⚠️ Failed to process {blob.name}: {e}")
            error_count += 1

    print(f"\n🎉 Done. Repaired: {fixed_count} | Already OK: {already_ok_count} | Errors: {error_count}")

if __name__ == "__main__":
    repair_all_in_gcs()