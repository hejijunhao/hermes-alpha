/* ── WebSocket Connection ────────────────── */
/* Manages WS lifecycle with exponential       */
/* backoff reconnection.                       */

import { getState, setState } from './terminal.js';
import { handleIncoming } from './messages.js';

let ws = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
const MAX_BACKOFF = 30000;

export function connect() {
  cleanup();

  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.onopen = () => {
    reconnectAttempts = 0;
    setState({ connected: true, connectTime: Date.now() });

    // Send current model config if we have one
    const { model, provider } = getState();
    if (model) {
      ws.send(JSON.stringify({ type: 'config', model, provider }));
    }
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handleIncoming(data);
    } catch (err) {
      console.error('[ws] parse error', err);
    }
  };

  ws.onclose = () => {
    setState({ connected: false, processing: false });
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws.close();
  };
}

export function send(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function isOpen() {
  return ws && ws.readyState === WebSocket.OPEN;
}

function cleanup() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), MAX_BACKOFF);
  reconnectTimer = setTimeout(connect, delay);
}
