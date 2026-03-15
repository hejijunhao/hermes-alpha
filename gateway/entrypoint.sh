#!/bin/bash
set -e

# ── Bootstrap persistent volume ──────────────────────────────────────
# When a Fly volume is mounted at /root/.hermes it starts empty.
# Seed the directory structure and default config on first boot.
HERMES_DIR="/root/.hermes"

if [ ! -f "$HERMES_DIR/.bootstrapped" ]; then
    echo "[entrypoint] First boot on fresh volume — seeding defaults"
    mkdir -p "$HERMES_DIR"/{sessions,logs,memories,skills,hooks,cron,image_cache,audio_cache}
    cp /opt/hermes-agent/.env.example "$HERMES_DIR/.env"
    cp /opt/hermes-agent/cli-config.yaml.example "$HERMES_DIR/config.yaml" 2>/dev/null || true
    cp /app/soul.md "$HERMES_DIR/SOUL.md" 2>/dev/null || true
    touch "$HERMES_DIR/.bootstrapped"
fi

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

# Messaging gateway platform tokens
write_if_set TELEGRAM_BOT_TOKEN
write_if_set TELEGRAM_ALLOWED_USERS
write_if_set TELEGRAM_HOME_CHANNEL
write_if_set DISCORD_BOT_TOKEN
write_if_set DISCORD_ALLOWED_USERS
write_if_set DISCORD_HOME_CHANNEL
write_if_set SLACK_BOT_TOKEN
write_if_set SLACK_APP_TOKEN
write_if_set SLACK_ALLOWED_USERS
write_if_set SIGNAL_HTTP_URL
write_if_set SIGNAL_ACCOUNT
write_if_set SIGNAL_ALLOWED_USERS

# ── Start the messaging gateway (Telegram/Discord/etc.) if configured ──
# Run it as a background process so the web terminal (uvicorn) remains PID 1.
# The gateway is independent — it connects to platforms via their bot APIs
# and calls the agent loop directly, so it stays alive even if the web
# terminal's PTY crashes.
GATEWAY_ENABLED=false
for var in TELEGRAM_BOT_TOKEN DISCORD_BOT_TOKEN SLACK_BOT_TOKEN SIGNAL_HTTP_URL; do
    if [ -n "$(grep "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d= -f2-)" ]; then
        GATEWAY_ENABLED=true
        break
    fi
done

if [ "$GATEWAY_ENABLED" = "true" ]; then
    echo "[entrypoint] Messaging gateway tokens detected — starting hermes gateway"
    cd /opt/hermes-agent && python -m hermes_cli.main gateway run >> /root/.hermes/logs/gateway.log 2>&1 &
    GATEWAY_PID=$!
    echo "[entrypoint] Gateway started (PID $GATEWAY_PID)"

    # If the gateway dies unexpectedly, restart it
    (
        while true; do
            wait $GATEWAY_PID 2>/dev/null
            EXIT_CODE=$?
            if [ $EXIT_CODE -ne 0 ]; then
                echo "[entrypoint] Gateway exited ($EXIT_CODE) — restarting in 5s"
                sleep 5
                cd /opt/hermes-agent && python -m hermes_cli.main gateway run >> /root/.hermes/logs/gateway.log 2>&1 &
                GATEWAY_PID=$!
                echo "[entrypoint] Gateway restarted (PID $GATEWAY_PID)"
            else
                break
            fi
        done
    ) &
else
    echo "[entrypoint] No messaging platform tokens found — gateway skipped"
fi

exec uvicorn app:app --host 0.0.0.0 --port 8080 --app-dir /app
