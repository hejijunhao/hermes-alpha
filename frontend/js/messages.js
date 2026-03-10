/* ── Message Rendering ───────────────────── */
/* Handles message display, markdown, scroll,  */
/* copy-to-clipboard, processing states.       */

import { getState, setState, subscribe } from './terminal.js';

const output = document.getElementById('output');
const newMsgBtn = document.getElementById('new-messages');

let userScrolledUp = false;

// ── Auto-scroll detection ─────────────────
output.addEventListener('scroll', () => {
  const threshold = 60;
  const atBottom = output.scrollHeight - output.scrollTop - output.clientHeight < threshold;
  userScrolledUp = !atBottom;
  if (atBottom) {
    newMsgBtn.hidden = true;
  }
}, { passive: true });

newMsgBtn.addEventListener('click', () => {
  output.scrollTop = output.scrollHeight;
  newMsgBtn.hidden = true;
  userScrolledUp = false;
});

// ── Handle incoming WS message ────────────
export function handleIncoming(data) {
  // "PROCESSING..." is transient — show indicator, don't append
  if (data.type === 'system' && data.content === 'PROCESSING...') {
    setState({ processing: true });
    showProcessing(true);
    return;
  }

  // Any other message clears processing
  if (getState().processing) {
    setState({ processing: false });
    showProcessing(false);
  }

  appendMessage(data.type, data.content);
  setState({ messageCount: getState().messageCount + 1 });
}

// ── Append a message to output ────────────
export function appendMessage(type, content) {
  const msg = document.createElement('div');
  msg.className = `msg ${type}`;

  // Gutter (index + colored bar)
  const gutter = document.createElement('div');
  gutter.className = 'msg-gutter';

  const idx = document.createElement('span');
  idx.className = 'msg-idx';
  const count = getState().messageCount + 1;
  idx.textContent = String(count).padStart(3, '0');

  const bar = document.createElement('div');
  bar.className = 'msg-bar';

  gutter.appendChild(idx);
  gutter.appendChild(bar);

  // Body (content + meta)
  const body = document.createElement('div');
  body.className = 'msg-body';

  const contentEl = document.createElement('div');
  contentEl.className = 'msg-content';

  if (type === 'assistant') {
    contentEl.innerHTML = renderMarkdown(content);

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-copy';
    copyBtn.textContent = 'COPY';
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => {
        copyBtn.textContent = 'COPIED';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.textContent = 'COPY';
          copyBtn.classList.remove('copied');
        }, 1500);
      });
    });
    body.appendChild(copyBtn);
  } else {
    contentEl.textContent = content;
  }

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  const now = new Date();
  const ts = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':');

  const { model } = getState();
  const modelShort = model ? model.split('/').pop() : '';
  meta.textContent = type === 'system' ? ts : `${ts} // ${modelShort}`;

  body.appendChild(contentEl);
  body.appendChild(meta);

  msg.appendChild(gutter);
  msg.appendChild(body);
  output.appendChild(msg);

  // Scroll handling
  if (!userScrolledUp) {
    output.scrollTop = output.scrollHeight;
  } else {
    newMsgBtn.hidden = false;
  }
}

// ── Processing indicator ──────────────────
function showProcessing(on) {
  const prev = output.querySelector('.msg.system.processing');
  if (prev) prev.remove();

  if (on) {
    const msg = document.createElement('div');
    msg.className = 'msg system processing';

    const gutter = document.createElement('div');
    gutter.className = 'msg-gutter';
    const bar = document.createElement('div');
    bar.className = 'msg-bar';
    gutter.appendChild(bar);

    const body = document.createElement('div');
    body.className = 'msg-body';
    const contentEl = document.createElement('div');
    contentEl.className = 'msg-content';
    contentEl.textContent = '···';
    body.appendChild(contentEl);

    msg.appendChild(gutter);
    msg.appendChild(body);
    output.appendChild(msg);

    if (!userScrolledUp) {
      output.scrollTop = output.scrollHeight;
    }
  }
}

// ── Markdown Renderer (minimal, safe) ─────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Extract code blocks to protect from further processing
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    codeBlocks.push(
      `<pre class="code-block"${lang ? ` data-lang="${lang}"` : ''}><code>${code}</code></pre>`
    );
    return `\x00CB${codeBlocks.length - 1}\x00`;
  });

  // Extract inline code
  const inlineCodes = [];
  html = html.replace(/`([^`\n]+)`/g, (_, code) => {
    inlineCodes.push(`<code class="inline-code">${code}</code>`);
    return `\x00IC${inlineCodes.length - 1}\x00`;
  });

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic (single * not preceded/followed by *)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Links (only http/https for safety)
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  // Restore code blocks and inline code
  html = html.replace(/\x00CB(\d+)\x00/g, (_, i) => codeBlocks[i]);
  html = html.replace(/\x00IC(\d+)\x00/g, (_, i) => inlineCodes[i]);

  return html;
}
