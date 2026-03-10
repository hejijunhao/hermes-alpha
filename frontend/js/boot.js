/* ── Boot Sequence ───────────────────────── */
/* Cinematic startup animation on first load.  */

import { setState } from './terminal.js';

const bootScreen = document.getElementById('boot-screen');
const bootLog = document.getElementById('boot-log');
const terminal = document.getElementById('terminal');

const BOOT_LINES = [
  { text: 'HERMES TERMINAL v0.3.0', cls: 'title', delay: 200 },
  { text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', cls: 'divider', delay: 150 },
  { text: 'INITIALIZING NEURAL LINK.............. ', ok: 'OK', delay: 400 },
  { text: 'LOADING MODEL REGISTRY................ ', ok: 'OK', delay: 350 },
  { text: 'CALIBRATING SYNC RATIO................ ', ok: 'OK', delay: 300 },
  { text: 'ESTABLISHING WEBSOCKET................ ', ok: 'OK', delay: 450 },
  { text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', cls: 'divider', delay: 150 },
  { text: 'SYSTEM READY. ALL STATIONS NOMINAL.', cls: '', delay: 300 },
];

export async function runBootSequence() {
  // Pre-create all lines (hidden)
  const lineEls = BOOT_LINES.map(line => {
    const el = document.createElement('div');
    el.className = `boot-line${line.cls ? ' ' + line.cls : ''}`;

    if (line.ok) {
      const textNode = document.createTextNode(line.text);
      const okSpan = document.createElement('span');
      okSpan.className = 'ok';
      okSpan.textContent = line.ok;
      el.appendChild(textNode);
      el.appendChild(okSpan);
    } else {
      el.textContent = line.text;
    }

    bootLog.appendChild(el);
    return { el, delay: line.delay };
  });

  // Reveal lines sequentially
  for (const { el, delay } of lineEls) {
    await sleep(delay);
    el.classList.add('visible');
  }

  // Hold for a beat, then transition
  await sleep(600);

  bootScreen.classList.add('done');
  terminal.classList.remove('hidden');

  // Cleanup after transition
  await sleep(500);
  bootScreen.remove();

  setState({ booted: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
