FROM python:3.11-slim

WORKDIR /app

# Install server dependencies
COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

# Copy application code
COPY server/ server/
COPY frontend/ frontend/

EXPOSE 8080

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8080"]
