import asyncio
import json
import os
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@app.get("/")
async def index():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    await ws.send_json({"type": "system", "content": "HERMES LINK ESTABLISHED"})

    try:
        while True:
            data = await ws.receive_json()
            user_msg = data.get("content", "")

            # TODO: Replace with actual Hermes agent subprocess
            # For now, echo back to prove the pipeline works end-to-end
            await ws.send_json({"type": "assistant", "content": f"[echo] {user_msg}"})

    except WebSocketDisconnect:
        pass


# Serve static frontend assets (must be mounted last)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
