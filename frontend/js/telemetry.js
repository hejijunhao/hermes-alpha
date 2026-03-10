/* ── Telemetry & Ornamental Data ─────────── */
/* Clock, uptime counter, sync ratio, message  */
/* count — decorative data density.            */

import { getState, subscribe } from './terminal.js';

const clockEl = document.getElementById('clock');
const uptimeEl = document.getElementById('uptime');
const syncEl = document.getElementById('sync-ratio');
const telemMsgs = document.getElementById('telem-msgs');
const telemBar = document.getElementById('telem-bar');
const footerStatus = document.getElementById('footer-status');
const inputBar = document.getElementById('input-bar');
const headerEl = document.getElementById('header');
const cmdCountEl = document.getElementById('cmd-count');

let clockInterval = null;

export function initTelemetry() {
  // Start clock
  updateClock();
  clockInterval = setInterval(updateClock, 1000);

  // Subscribe to state changes
  subscribe(onStateChange);
}

function updateClock() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  clockEl.textContent = `${y}.${mo}.${d} ${h}:${mi}:${s}`;

  // Update uptime
  const { connectTime, connected } = getState();
  if (connected && connectTime) {
    const elapsed = Math.floor((Date.now() - connectTime) / 1000);
    const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const ss = String(elapsed % 60).padStart(2, '0');
    uptimeEl.textContent = `T+${hh}:${mm}:${ss}`;
  }
}

function onStateChange(patch, state) {
  // Connection state
  if ('connected' in patch) {
    if (state.connected) {
      footerStatus.textContent = '● READY';
      footerStatus.className = 'footer-state ready';
      headerEl.classList.remove('disconnected');
      inputBar.classList.remove('processing');
    } else {
      footerStatus.textContent = '● LINK SEVERED';
      footerStatus.className = 'footer-state disconnected';
      headerEl.classList.add('disconnected');
      uptimeEl.textContent = 'T+--:--:--';
    }
  }

  // Processing state
  if ('processing' in patch) {
    if (state.processing) {
      footerStatus.textContent = '● PROCESSING';
      footerStatus.className = 'footer-state processing';
      telemBar.classList.add('active');
      inputBar.classList.add('processing');
    } else if (state.connected) {
      footerStatus.textContent = '● READY';
      footerStatus.className = 'footer-state ready';
      telemBar.classList.remove('active');
      inputBar.classList.remove('processing');
    }
  }

  // Message count → sync ratio + telemetry counter
  if ('messageCount' in patch) {
    const ratio = Math.min(99.99, state.messageCount * 7.77).toFixed(2);
    syncEl.textContent = ratio.padStart(6, '0');
    telemMsgs.textContent = String(state.messageCount).padStart(4, '0');
  }

  // Command count
  if ('commandCount' in patch) {
    cmdCountEl.textContent = String(state.commandCount).padStart(3, '0');
  }
}
