# 1. Use a lightweight Python base image (Linux based)
FROM python:3.12-slim

# 2. Set the folder inside the container where we will work
WORKDIR /app

# 3. Copy our specific requirements (libraries)
COPY requirements.txt .

# 4. Install the libraries inside the container
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy your code into the container
COPY ingest.py .
COPY transform.py .

# 6. The command to run when the container starts
CMD ["python", "ingest.py"]
