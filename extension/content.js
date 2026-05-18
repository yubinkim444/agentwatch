// agentwatch content script
// Injects a draggable translucent overlay and connects to a localhost
// WebSocket server that the agent's SDK runs. Each incoming message
// updates the overlay in place.

(function () {
  const DEFAULT_PORT = 8765;
  const PORT = window.__AGENTWATCH_PORT__ || DEFAULT_PORT;
  const URL = `ws://127.0.0.1:${PORT}`;

  if (window.__agentwatchInjected) return;
  window.__agentwatchInjected = true;

  const root = document.createElement('div');
  root.id = 'agentwatch-overlay';
  root.innerHTML = `
    <div class="aw-bar">
      <span class="aw-dot aw-disconnected" title="WebSocket status"></span>
      <span class="aw-title">agentwatch</span>
      <span class="aw-spacer"></span>
      <button class="aw-hide" title="Hide">×</button>
    </div>
    <div class="aw-row"><div class="aw-label">goal</div><div class="aw-value" data-k="goal">—</div></div>
    <div class="aw-row"><div class="aw-label">last</div><div class="aw-value" data-k="last_action">—</div></div>
    <div class="aw-row"><div class="aw-label">next</div><div class="aw-value" data-k="next_action">—</div></div>
    <div class="aw-row"><div class="aw-label">step</div><div class="aw-value" data-k="step">—</div></div>
    <div class="aw-row aw-error" style="display:none"><div class="aw-label">error</div><div class="aw-value" data-k="error">—</div></div>
  `;
  document.documentElement.appendChild(root);

  const dot = root.querySelector('.aw-dot');
  const hideBtn = root.querySelector('.aw-hide');
  hideBtn.addEventListener('click', () => { root.style.display = 'none'; });

  // Make it draggable
  let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
  const bar = root.querySelector('.aw-bar');
  bar.addEventListener('mousedown', (e) => {
    if (e.target === hideBtn) return;
    dragging = true; startX = e.clientX; startY = e.clientY;
    const rect = root.getBoundingClientRect();
    origX = rect.left; origY = rect.top;
    root.style.right = 'auto'; root.style.bottom = 'auto';
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    root.style.left = (origX + e.clientX - startX) + 'px';
    root.style.top = (origY + e.clientY - startY) + 'px';
  });
  window.addEventListener('mouseup', () => { dragging = false; });

  function apply(payload) {
    for (const key of ['goal', 'last_action', 'next_action', 'step', 'error']) {
      const el = root.querySelector(`[data-k="${key}"]`);
      if (!el) continue;
      const value = payload[key];
      if (value === undefined || value === null || value === '') continue;
      el.textContent = String(value);
      if (key === 'error') {
        el.parentElement.style.display = 'flex';
        flash(el.parentElement, '#ef4444');
      } else {
        flash(el, '#22c55e');
      }
    }
  }

  function flash(el, color) {
    el.style.transition = 'background 1.2s ease-out';
    el.style.background = color + '33';
    setTimeout(() => { el.style.background = 'transparent'; }, 1200);
  }

  let ws;
  function connect() {
    try {
      ws = new WebSocket(URL);
    } catch (e) {
      dot.className = 'aw-dot aw-disconnected';
      setTimeout(connect, 3000);
      return;
    }
    ws.addEventListener('open', () => {
      dot.className = 'aw-dot aw-connected';
    });
    ws.addEventListener('close', () => {
      dot.className = 'aw-dot aw-disconnected';
      setTimeout(connect, 3000);
    });
    ws.addEventListener('error', () => {
      dot.className = 'aw-dot aw-disconnected';
    });
    ws.addEventListener('message', (ev) => {
      try {
        apply(JSON.parse(ev.data));
      } catch (_e) { /* ignore */ }
    });
  }
  connect();
})();
