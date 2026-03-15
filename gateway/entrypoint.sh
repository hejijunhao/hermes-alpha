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
write_if_set ELEPHANTASM_API_KEY
write_if_set ELEPHANTASM_ANIMA_ID

# --- Hunter control: GitHub + Fly.io access ---
# These stay as env vars (not written to .hermes/.env) so the agent
# can use them directly via git and flyctl in the terminal.

if [ -n "$GITHUB_TOKEN" ]; then
    git config --global user.name "hermes-alpha"
    git config --global user.email "hermes-alpha@noreply"
    git config --global credential.helper 'store'
    # Pre-seed credential store so git push/pull Just Works
    echo "https://hermes-alpha:${GITHUB_TOKEN}@github.com" > /root/.git-credentials
fi

if [ -n "$HUNTER_REPO" ]; then
    echo "HUNTER_REPO=${HUNTER_REPO}" >> "$ENV_FILE"
fi

if [ -n "$HUNTER_FLY_APP" ]; then
    echo "HUNTER_FLY_APP=${HUNTER_FLY_APP}" >> "$ENV_FILE"
fi

exec uvicorn app:app --host 0.0.0.0 --port 8080 --app-dir /app
