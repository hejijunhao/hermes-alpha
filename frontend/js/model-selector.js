/* ── Custom Model Selector ───────────────── */
/* Replaces the native <select> with a fully   */
/* styled, keyboard-navigable dropdown.        */

import { getState, setState } from './terminal.js';
import { send, isOpen } from './connection.js';

const trigger = document.getElementById('model-trigger');
const label = document.getElementById('model-label');
const dropdown = document.getElementById('model-dropdown');

let providers = [];
let options = [];    // flat list of { el, model, provider }
let focusedIdx = -1;
let isOpenState = false;

// ── Load models from API ──────────────────
export async function loadModels() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('/api/models', { signal: controller.signal });
    clearTimeout(timeout);
    providers = await res.json();
    buildDropdown();
  } catch {
    label.textContent = 'UNAVAILABLE';
  }
}

// ── Build dropdown DOM ────────────────────
function buildDropdown() {
  dropdown.innerHTML = '';
  options = [];

  providers.forEach(prov => {
    // Group label
    const groupLabel = document.createElement('div');
    groupLabel.className = 'model-group-label';
    groupLabel.textContent = prov.label;
    dropdown.appendChild(groupLabel);

    prov.models.forEach(m => {
      const opt = document.createElement('div');
      opt.className = 'model-option';
      opt.setAttribute('role', 'option');
      opt.dataset.model = m.id;
      opt.dataset.provider = prov.id;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = m.label;

      // Extract size tag from label (e.g., "405B", "70B", "8B")
      const sizeMatch = m.label.match(/\b(\d+B)\b/i);
      const tagSpan = document.createElement('span');
      tagSpan.className = 'model-tag';
      tagSpan.textContent = sizeMatch ? sizeMatch[1].toUpperCase() : prov.id.toUpperCase();

      opt.appendChild(nameSpan);
      opt.appendChild(tagSpan);

      opt.addEventListener('click', () => selectOption(options.length));
      dropdown.appendChild(opt);

      options.push({ el: opt, model: m.id, provider: prov.id, label: m.label });
    });
  });

  // Select first option
  if (options.length > 0) {
    selectOption(0, true);
  }
}

// ── Select an option ──────────────────────
function selectOption(idx, silent = false) {
  if (idx < 0 || idx >= options.length) return;

  // Clear previous active
  options.forEach(o => o.el.classList.remove('active'));

  const opt = options[idx];
  opt.el.classList.add('active');
  label.textContent = opt.label;

  setState({ model: opt.model, provider: opt.provider });

  if (!silent && isOpen()) {
    send({ type: 'config', model: opt.model, provider: opt.provider });
  }

  closeDropdown();
}

// ── Toggle dropdown ───────────────────────
function openDropdown() {
  isOpenState = true;
  dropdown.hidden = false;
  // Force reflow for transition
  dropdown.offsetHeight;
  dropdown.classList.add('open');
  trigger.setAttribute('aria-expanded', 'true');

  // Focus the active option
  const activeIdx = options.findIndex(o => o.el.classList.contains('active'));
  setFocused(activeIdx >= 0 ? activeIdx : 0);

  document.addEventListener('click', onOutsideClick, true);
  document.addEventListener('keydown', onDropdownKey, true);
}

function closeDropdown() {
  isOpenState = false;
  dropdown.classList.remove('open');
  trigger.setAttribute('aria-expanded', 'false');
  focusedIdx = -1;
  clearFocused();

  // Wait for transition then hide
  setTimeout(() => {
    if (!isOpenState) dropdown.hidden = true;
  }, 120);

  document.removeEventListener('click', onOutsideClick, true);
  document.removeEventListener('keydown', onDropdownKey, true);
}

// ── Keyboard navigation ───────────────────
function onDropdownKey(e) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setFocused(Math.min(focusedIdx + 1, options.length - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      setFocused(Math.max(focusedIdx - 1, 0));
      break;
    case 'Enter':
      e.preventDefault();
      if (focusedIdx >= 0) selectOption(focusedIdx);
      break;
    case 'Escape':
      e.preventDefault();
      closeDropdown();
      trigger.focus();
      break;
  }
}

function setFocused(idx) {
  clearFocused();
  focusedIdx = idx;
  if (idx >= 0 && idx < options.length) {
    options[idx].el.classList.add('focused');
    options[idx].el.scrollIntoView({ block: 'nearest' });
  }
}

function clearFocused() {
  options.forEach(o => o.el.classList.remove('focused'));
}

// ── Outside click ─────────────────────────
function onOutsideClick(e) {
  if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
    closeDropdown();
  }
}

// ── Trigger click ─────────────────────────
trigger.addEventListener('click', () => {
  if (isOpenState) {
    closeDropdown();
  } else {
    openDropdown();
  }
});

trigger.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && !isOpenState) {
    e.preventDefault();
    openDropdown();
  }
});
