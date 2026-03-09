# Changelog

## Index

- [0.1.0 — Project Scaffolding](#010--project-scaffolding)

---

## 0.1.0 — Project Scaffolding

**2026-03-09**

Initial project scaffold for self-hosting the [Hermes agent](https://hermes-agent.nousresearch.com/) on Fly.io with an Evangelion-inspired terminal web UI.

### Added

- **FastAPI server** (`server/main.py`) — serves the frontend and exposes a WebSocket endpoint at `/ws` for real-time agent communication. Currently echoes input back as a stub.
- **Terminal UI** (`frontend/`) — single-page vanilla HTML/CSS/JS interface with:
  - Scanline overlay, neon red/blue/green palette, dark panel backgrounds
  - WebSocket client with auto-reconnect
  - Status indicator, sync ratio display, message history
- **Dockerfile** — Python 3.11-slim container serving the full app via uvicorn on port 8080.
- **fly.toml** — Fly.io deployment config targeting Amsterdam (`ams`), with auto-stop/start for cost efficiency.
- **docker-compose.yml** — local dev environment with hot-reload volume mounts.
- **Makefile** — shortcuts for `dev`, `up`, `down`, `deploy`, `logs`, `ssh`, `status`.
- **`.env.example`** — template for required API keys (OpenRouter, etc.).
- **`.gitignore` / `.dockerignore`** — standard exclusions for Python, Docker, IDE files.

### Architecture Decision

Chose **FastAPI + vanilla frontend** over Vue/Vite + Node for simplicity: one process, one port, no build step, no `node_modules`. The UI is a terminal emulator — a single WebSocket connection and ~200 lines of JS. Frameworks can be introduced later if complexity warrants it.
