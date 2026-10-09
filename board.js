/* Board controller: tokens, drag & drop, tools, persistence. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const STORE = 'bcb-state-v1';
  const R = 6;        // player token radius (0.6 m)
  const BALL_R = 4;

  const svg = document.getElementById('board');
  const courtLayer = document.getElementById('courtLayer');
  const drawLayer = document.getElementById('drawLayer');
  const tokenLayer = document.getElementById('tokenLayer');

  const TOKENS = [
    ...[1, 2, 3, 4, 5].map((n) => ({ id: 'b' + n, team: 'blue', label: n })),
    ...[1, 2, 3, 4, 5].map((n) => ({ id: 'k' + n, team: 'black', label: n })),
    { id: 'ball', team: 'ball' },
  ];

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------- Default lineups ---------- */
  function defaultPositions(mode) {
    const p = {};
    if (mode === 'full') {
      const blue = { 1: [120, 75], 2: [95, 35], 3: [95, 115], 4: [60, 50], 5: [60, 100] };
      for (const n in blue) {
        p['b' + n] = [...blue[n]];
        p['k' + n] = [Court.L - blue[n][0], blue[n][1]];
      }
      p.ball = [140, 75];
    } else {
      // Half court (basket at top): blue on offence, black defending
      const off = { 1: [75, 100], 2: [130, 60], 3: [20, 60], 4: [40, 25], 5: [105, 30] };
      const basket = [75, 15.75];
      for (const n in off) {
        const [x, y] = off[n];
        p['b' + n] = [x, y];
        p['k' + n] = [x + (basket[0] - x) * 0.2, y + (basket[1] - y) * 0.2];
      }
      p.ball = [86, 102];
    }
    return p;
  }

  /* ---------- State ---------- */
  function freshBoard(mode) { return { tokens: defaultPositions(mode), strokes: [] }; }

  function loadState() {
    const fresh = { mode: 'full', tool: 'move', color: '#E53935', boards: { full: freshBoard('full'), half: freshBoard('half') } };
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (!s || !s.boards) return fresh;
      for (const m of ['full', 'half']) {
        const b = s.boards[m] || freshBoard(m);
        const defs = defaultPositions(m);
        b.tokens = { ...defs, ...(b.tokens || {}) };
        b.strokes = Array.isArray(b.strokes) ? b.strokes : [];
        s.boards[m] = b;
      }
      s.tool = s.tool || 'move';
      s.mode = s.mode === 'half' ? 'half' : 'full';
      s.color = s.color || fresh.color;
      return s;
    } catch {
      return fresh;
    }
  }

  const state = loadState();
  const histories = { full: [], half: [] };
  const board = () => state.boards[state.mode];
  const hist = () => histories[state.mode];

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
    }, 150);
  }

  /* ---------- Tokens ---------- */
  const tokenEls = {};

  function createTokens() {
    for (const t of TOKENS) {
      const g = el('g', { class: 'token', 'data-id': t.id }, tokenLayer);
      const inner = el('g', { class: 'inner' }, g);
      if (t.team === 'ball') {
        el('circle', { r: 8, fill: 'rgba(0,0,0,0)' }, inner); // larger touch target
        el('circle', { cx: 0.6, cy: 0.9, r: BALL_R, fill: 'rgba(0,0,0,0.35)' }, inner);
        el('circle', { r: BALL_R, fill: 'url(#gBall)', stroke: '#5a2a00', 'stroke-width': 0.3 }, inner);
        const a = BALL_R, b = BALL_R * 0.7;
        el('path', {
          d: `M${-a} 0 H${a} M0 ${-a} V${a} M${-b} ${-b} Q${-a * 0.25} 0 ${-b} ${b} M${b} ${-b} Q${a * 0.25} 0 ${b} ${b}`,
          fill: 'none', stroke: '#3a1a00', 'stroke-width': 0.3,
        }, inner);
      } else {
        const blue = t.team === 'blue';
        el('circle', { r: R + 2, fill: 'rgba(0,0,0,0)' }, inner);
        el('circle', { cx: 0.8, cy: 1.2, r: R, fill: 'rgba(0,0,0,0.35)' }, inner);
        el('circle', { r: R, fill: blue ? 'url(#gBlue)' : 'url(#gBlack)', stroke: blue ? '#E9FFFF' : '#BDBDBD', 'stroke-width': 0.6 }, inner);
        const txt = el('text', {
          dy: '0.36em', 'text-anchor': 'middle', 'font-size': 7, 'font-weight': 800,
          'font-family': '-apple-system, Helvetica, Arial, sans-serif',
          fill: blue ? '#05303A' : '#FFFFFF',
        }, inner);
        txt.textContent = t.label;
      }
      tokenEls[t.id] = g;
    }
  }

  function placeToken(id) {
    const [x, y] = board().tokens[id];
    tokenEls[id].setAttribute('transform', `translate(${x} ${y})`);
  }
  const placeTokens = () => TOKENS.forEach((t) => placeToken(t.id));

  /* ---------- View fitting ---------- */
  let vb = { x: 0, y: 0, w: 1, h: 1 };

  function fitView() {
    const b = Court.bounds(state.mode);
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const s = Math.min(r.width / b.w, r.height / b.h);
    const w = r.width / s, h = r.height / s;
    vb = { x: b.x - (w - b.w) / 2, y: b.y - (h - b.h) / 2, w, h };
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  }

  function clamp([x, y]) {
    const m = R * 0.6;
    return [
      Math.max(vb.x + m, Math.min(vb.x + vb.w - m, x)),
      Math.max(vb.y + m, Math.min(vb.y + vb.h - m, y)),
    ];
  }

  function clampAll() {
    const t = board().tokens;
    for (const id in t) t[id] = clamp(t[id]);
  }

  function relayout() {
    fitView();
    clampAll();
    placeTokens();
  }

  function render() {
    Court.draw(courtLayer, state.mode);
    relayout();
    Drawing.render(drawLayer, board().strokes);
    updateUI();
  }

  /* ---------- Pointer handling (multi-touch) ---------- */
  const active = new Map();

  function toSvg(e) {
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  }

  svg.addEventListener('pointerdown', (e) => {
    const p = toSvg(e);
    if (state.tool === 'move') {
      const t = e.target.closest && e.target.closest('.token');
      if (!t) return;
      const id = t.dataset.id;
      const [x, y] = board().tokens[id];
      active.set(e.pointerId, { kind: 'drag', id, dx: x - p.x, dy: y - p.y });
      tokenLayer.appendChild(t); // bring to front
      t.querySelector('.inner').setAttribute('transform', 'scale(1.12)');
    } else if (state.tool === 'draw') {
      const stroke = Drawing.begin(board().strokes, hist(), p, state.color);
      active.set(e.pointerId, { kind: 'draw', stroke });
    } else {
      Drawing.eraseAt(board().strokes, hist(), p);
      active.set(e.pointerId, { kind: 'erase' });
    }
    try { svg.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
    updateUI();
  });

  svg.addEventListener('pointermove', (e) => {
    const a = active.get(e.pointerId);
    if (!a) return;
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    const list = events.length ? events : [e];
    if (a.kind === 'drag') {
      const p = toSvg(e);
      board().tokens[a.id] = clamp([p.x + a.dx, p.y + a.dy]);
      placeToken(a.id);
    } else if (a.kind === 'draw') {
      for (const ev of list) Drawing.extend(a.stroke, toSvg(ev));
    } else {
      for (const ev of list) Drawing.eraseAt(board().strokes, hist(), toSvg(ev));
      updateUI();
    }
    e.preventDefault();
  });

  function endPointer(e) {
    const a = active.get(e.pointerId);
    if (!a) return;
    active.delete(e.pointerId);
    if (a.kind === 'drag') tokenEls[a.id].querySelector('.inner').removeAttribute('transform');
    save();
    updateUI();
  }
  svg.addEventListener('pointerup', endPointer);
  svg.addEventListener('pointercancel', endPointer);

  // Block iOS page gestures (pinch zoom, double-tap zoom, rubber-band scroll)
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  /* ---------- Toolbar ---------- */
  const $ = (s) => document.querySelector(s);

  function updateUI() {
    document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
    document.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === state.tool));
    document.querySelectorAll('[data-color]').forEach((b) => b.classList.toggle('active', b.dataset.color === state.color));
    $('#colors').classList.toggle('dim', state.tool !== 'draw');
    svg.classList.remove('tool-move', 'tool-draw', 'tool-erase');
    svg.classList.add('tool-' + state.tool);
    tokenLayer.classList.toggle('inert', state.tool !== 'move');
    $('#undoBtn').disabled = hist().length === 0;
    $('#clearBtn').disabled = board().strokes.length === 0;
  }

  $('#modeSeg').addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]')?.dataset.mode;
    if (!m || m === state.mode) return;
    state.mode = m;
    render();
    save();
  });

  $('#toolSeg').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tool]')?.dataset.tool;
    if (!t) return;
    state.tool = t;
    updateUI();
    save();
  });

  $('#colors').addEventListener('click', (e) => {
    const c = e.target.closest('[data-color]')?.dataset.color;
    if (!c) return;
    state.color = c;
    state.tool = 'draw'; // picking a colour switches to the pen
    updateUI();
    save();
  });

  $('#undoBtn').addEventListener('click', () => {
    Drawing.undo(board().strokes, hist());
    updateUI();
    save();
  });

  $('#clearBtn').addEventListener('click', () => {
    Drawing.clear(board().strokes, hist());
    updateUI();
    save();
  });

  $('#resetBtn').addEventListener('click', () => {
    board().tokens = defaultPositions(state.mode);
    relayout();
    save();
  });

  /* ---------- Init ---------- */
  createTokens();
  render();
  new ResizeObserver(relayout).observe(svg);
  window.addEventListener('orientationchange', () => setTimeout(relayout, 300));

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
