import asyncio
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

load_dotenv()

log = logging.getLogger("hermes")

app = FastAPI()

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

# --- Hermes agent configuration ---
HERMES_MODEL = os.getenv("LLM_MODEL", "nousresearch/hermes-3-llama-3.1-405b")
HERMES_MAX_ITERATIONS = int(os.getenv("HERMES_MAX_ITERATIONS", "10"))


def _create_agent():
    """Create a fresh AIAgent instance for a single session."""
    from run_agent import AIAgent

    return AIAgent(
        model=HERMES_MODEL,
        quiet_mode=True,
        skip_context_files=True,
        skip_memory=True,
        max_iterations=HERMES_MAX_ITERATIONS,
        disabled_toolsets=["terminal"],
    )


@app.get("/")
async def index():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    await ws.send_json({"type": "system", "content": "HERMES LINK ESTABLISHED"})

    loop = asyncio.get_running_loop()
    agent = _create_agent()
    conversation_history = []

    try:
        while True:
            data = await ws.receive_json()
            user_msg = data.get("content", "")

            # Tell the client we're working
            await ws.send_json({"type": "system", "content": "PROCESSING..."})

            try:
                # AIAgent.run_conversation() is synchronous — run in a thread
                result = await loop.run_in_executor(
                    None,
                    lambda: agent.run_conversation(
                        user_message=user_msg,
                        conversation_history=conversation_history,
                    ),
                )

                reply = result.get("final_response", "")
                conversation_history = result.get("messages", conversation_history)

                await ws.send_json({"type": "assistant", "content": reply})

            except Exception as e:
                log.exception("Agent error")
                await ws.send_json({
                    "type": "system",
                    "content": f"AGENT ERROR: {e}",
                })

    except WebSocketDisconnect:
        pass


# Serve static frontend assets (must be mounted last)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
