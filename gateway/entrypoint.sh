#!/bin/bash
set -e

# Write Fly.io secrets into the hermes .env file so the CLI picks them up.
ENV_FILE="/root/.hermes/.env"

write_if_set() {
    local var="$1"
    local val="${!var}"
    if [ -n "$val" ]; then
        sed -i "/^${var}=/d" "$ENV_FILE"
        echo "${var}=${val}" >> "$ENV_FILE"
    fi
}

write_if_set OPENROUTER_API_KEY
write_if_set HERMES_API_KEY
write_if_set ANTHROPIC_API_KEY
write_if_set OPENAI_API_KEY
write_if_set FIRECRAWL_API_KEY
write_if_set FAL_KEY

exec uvicorn app:app --host 0.0.0.0 --port 8080 --app-dir /app
