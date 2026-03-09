.PHONY: dev deploy logs ssh status

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
