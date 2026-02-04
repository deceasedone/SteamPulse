# 1. Use a lightweight Python base image (Linux based)
FROM python:3.12-slim

# 2. Set the folder inside the container where we will work
WORKDIR /app

# 3. Copy our specific requirements (libraries)
# We need to generate this file first! (See Step 3 below)
COPY requirements.txt .

# 4. Install the libraries inside the container
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy your code and your Key File into the container
COPY steam_app_list.json .
COPY ingest.py .
COPY gcp_keys.json .

# 6. The command to run when the container starts
CMD ["python", "ingest.py"]