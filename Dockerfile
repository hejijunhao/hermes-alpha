FROM python:3.11-slim

WORKDIR /app

# Install git (required to clone hermes-agent from GitHub)
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# Install server dependencies (excluding hermes-agent)
COPY server/requirements.txt server/requirements.txt
RUN pip install --no-cache-dir -r server/requirements.txt

# Install hermes-agent from source so the missing `agent` package is included.
# Upstream pyproject.toml omits the `agent/` directory from packages.find,
# so a plain `pip install` from Git doesn't ship it. We clone, patch, and install.
RUN git clone --depth 1 https://github.com/NousResearch/hermes-agent.git /tmp/hermes-agent \
    && cd /tmp/hermes-agent \
    && sed -i 's/include = \[/include = ["agent", /' pyproject.toml \
    && pip install --no-cache-dir . \
    && rm -rf /tmp/hermes-agent

# Copy application code
COPY server/ server/
COPY frontend/ frontend/

EXPOSE 8080

CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8080"]
