const output = document.getElementById('output');
const input = document.getElementById('input');
const status = document.getElementById('status');
const indicator = document.getElementById('indicator');
const syncRatio = document.getElementById('sync-ratio');

let ws;
let msgCount = 0;

function connect() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.onopen = () => {
    setOnline(true);
  };

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    appendMessage(data.type, data.content);
    updateSync();
  };

  ws.onclose = () => {
    setOnline(false);
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

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && input.value.trim()) {
    const msg = input.value.trim();
    appendMessage('user', msg);
    ws.send(JSON.stringify({ content: msg }));
    input.value = '';
  }
});

connect();
