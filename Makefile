.PHONY: dev deploy logs ssh status \
       gateway-up gateway-down gateway-deploy gateway-logs gateway-ssh gateway-status

# ── Web Terminal (existing) ──────────────────────────────

# Local development
dev:
	uvicorn server.main:app --reload --host 0.0.0.0 --port 8080

# Docker local
up:
	docker compose up --build

down:
	docker compose down

# Fly.io
deploy:
	fly deploy

logs:
	fly logs

ssh:
	fly ssh console

status:
	fly status

# ── Hermes Agent CLI (gateway/) ──────────────────────────

gateway-up:
	docker compose -f gateway/docker-compose.yml up --build

gateway-down:
	docker compose -f gateway/docker-compose.yml down

gateway-deploy:
	cd gateway && fly deploy

gateway-logs:
	fly logs --config gateway/fly.toml

gateway-ssh:
	fly ssh console --config gateway/fly.toml

gateway-status:
	fly status --config gateway/fly.toml
