FROM python:3.11-slim

WORKDIR /app

# Install git (required to clone hermes-agent from GitHub)
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# Install server dependencies
COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

# Install hermes-agent: clone full source and install its dependencies.
# We use PYTHONPATH instead of pip-installing the package itself because
# upstream pyproject.toml is missing several packages/sub-packages
# (agent/, tools/environments/) from its packages.find config.
RUN git clone --depth 1 https://github.com/NousResearch/hermes-agent.git /opt/hermes-agent \
    && cd /opt/hermes-agent \
    && pip install --no-cache-dir -r requirements.txt \
    && rm -rf .git

ENV PYTHONPATH="/opt/hermes-agent:${PYTHONPATH}"

# Copy application code
COPY server/ server/
COPY frontend/ frontend/

EXPOSE 8080

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8080"]
