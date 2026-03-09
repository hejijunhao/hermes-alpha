# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hermes is a self-hosted web terminal for interacting with the Hermes AI agent (from Nous Research). It wraps the agent in an Evangelion-inspired retrofuturist UI — dark backgrounds, neon accents, scanline overlays, dense monospace layout. Deployed on Fly.io.

## Commands

```bash
make dev          # Run locally with hot-reload (uvicorn, port 8080)
make up           # Run via Docker Compose (port 8080)
make down         # Stop Docker Compose
make deploy       # Deploy to Fly.io
make logs         # Tail Fly.io logs
```

## Architecture

- **`server/main.py`** — FastAPI app. Serves the frontend as static files and exposes a `/ws` WebSocket endpoint for real-time chat. The WebSocket handler is where the Hermes agent integration goes (currently echoes input).
- **`frontend/`** — Vanilla HTML/CSS/JS (no build step). Connects to `/ws` on load, auto-reconnects on disconnect. Static assets served from `/static` via FastAPI's `StaticFiles` mount.
- Communication is exclusively via WebSocket JSON messages with shape `{ type: "system"|"user"|"assistant", content: string }`.

## Design Language

The UI follows an Evangelion/NERV-inspired aesthetic: CRT scanlines, neon red/blue/green/amber palette, monospace typography, information-dense layout. See `docs/vision.md` for full design guidelines. Preserve this aesthetic when adding UI elements.

## Environment

Copy `.env.example` to `.env`. Requires at minimum `OPENROUTER_API_KEY`. The app runs on port 8080 in all environments.
