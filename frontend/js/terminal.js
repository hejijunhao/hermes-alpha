/* ── Terminal State ───────────────────────── */
/* Centralised state + observer pattern.       */
/* No framework — just functions & callbacks.  */

const state = {
  connected: false,
  processing: false,
  model: null,
  provider: null,
  messageCount: 0,
  commandCount: 0,
  connectTime: null,
  booted: false,
};

const listeners = new Set();

export function getState() {
  return { ...state };
}

export function setState(patch) {
  Object.assign(state, patch);
  for (const fn of listeners) {
    try { fn(patch, state); } catch (e) { console.error('[state]', e); }
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
