const output = document.getElementById('output');
const input = document.getElementById('input');
const status = document.getElementById('status');
const indicator = document.getElementById('indicator');
const syncRatio = document.getElementById('sync-ratio');

let ws;
let msgCount = 0;
let processing = false;

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.onopen = () => {
    setOnline(true);
  };

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);

    // "PROCESSING..." is a transient status — show it as a pulsing indicator
    if (data.type === 'system' && data.content === 'PROCESSING...') {
      setProcessing(true);
      return;
    }

    // Any other message clears the processing state
    if (processing) {
      setProcessing(false);
    }

    appendMessage(data.type, data.content);
    updateSync();
  };

  ws.onclose = () => {
    setOnline(false);
    setProcessing(false);
    appendMessage('system', 'LINK SEVERED — RECONNECTING...');
    setTimeout(connect, 3000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

function appendMessage(type, content) {
  const el = document.createElement('div');
  el.className = `msg ${type}`;
  el.textContent = content;
  output.appendChild(el);
  output.scrollTop = output.scrollHeight;
  msgCount++;
}

function updateSync() {
  const ratio = Math.min(99.99, msgCount * 7.77).toFixed(2);
  syncRatio.textContent = ratio.padStart(6, '0');
}

function setOnline(on) {
  status.textContent = on ? 'ONLINE' : 'OFFLINE';
  status.classList.toggle('online', on);
  indicator.classList.toggle('active', on);
}

function setProcessing(on) {
  processing = on;
  input.disabled = on;

  // Remove any previous processing message
  const prev = output.querySelector('.msg.system.processing');
  if (prev) prev.remove();

  if (on) {
    const el = document.createElement('div');
    el.className = 'msg system processing';
    el.textContent = 'PROCESSING...';
    output.appendChild(el);
    output.scrollTop = output.scrollHeight;
    input.placeholder = 'AWAITING RESPONSE...';
  } else {
    input.placeholder = '';
    input.focus();
  }
}

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && input.value.trim() && !processing) {
    const msg = input.value.trim();
    appendMessage('user', msg);
    ws.send(JSON.stringify({ content: msg }));
    input.value = '';
  }
});

connect();
