/* ── HERMES TERMINAL — Entry Point ────────── */
/* Orchestrates boot, connection, UI modules.  */

import { getState, setState, subscribe } from './terminal.js';
import { connect, send } from './connection.js';
import { appendMessage } from './messages.js';
import { loadModels } from './model-selector.js';
import { initTelemetry } from './telemetry.js';
import { runBootSequence } from './boot.js';

// ── DOM refs ──────────────────────────────
const input = document.getElementById('input');
const inputBar = document.getElementById('input-bar');
const statusEl = document.getElementById('status');
const indicatorEl = document.getElementById('indicator');

// ── Input handling ────────────────────────
input.addEventListener('keydown', (e) => {
  // Enter to submit, Shift+Enter for newline
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const msg = input.value.trim();
    if (!msg || getState().processing) return;

    appendMessage('user', msg);
    send({ content: msg });
    setState({ commandCount: getState().commandCount + 1 });

    input.value = '';
    autoResize();
  }
});

// Auto-resize textarea
input.addEventListener('input', autoResize);

function autoResize() {
  input.style.height = 'auto';
  input.style.height = input.scrollHeight + 'px';
}

// Focus tracking for input bar glow
input.addEventListener('focus', () => inputBar.classList.add('focused'));
input.addEventListener('blur', () => inputBar.classList.remove('focused'));

// ── State-driven UI updates ───────────────
subscribe((patch, state) => {
  // Online/offline status
  if ('connected' in patch) {
    statusEl.textContent = state.connected ? 'ONLINE' : 'OFFLINE';
    statusEl.classList.toggle('online', state.connected);
    indicatorEl.classList.toggle('active', state.connected);

    if (state.connected && state.booted) {
      // Show reconnection message if not the first connect
      // (first connect message comes from server)
    }

    if (!state.connected && state.booted) {
      appendMessage('system', 'LINK SEVERED — RECONNECTING...');
    }
  }

  // Processing state → input field
  if ('processing' in patch) {
    input.disabled = state.processing;
    if (state.processing) {
      input.placeholder = 'AWAITING RESPONSE...';
    } else {
      input.placeholder = 'ENTER COMMAND';
      input.focus();
    }
  }
});

// ── Init sequence ─────────────────────────
async function init() {
  initTelemetry();

  // Run boot animation while loading models in parallel
  const [, ] = await Promise.all([
    runBootSequence(),
    loadModels(),
  ]);

  // Connect after boot
  connect();

  // Focus input
  input.focus();
}

init();
