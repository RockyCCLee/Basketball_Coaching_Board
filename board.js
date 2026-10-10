/* Board controller: tokens, drag & drop, tools, persistence. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const STORE = 'bcb-state-v3';
  const R = 6;        // player token radius (0.6 m)
  const BALL_R = 4;
  const ATTACH_DIST = 9.0; // distance within which a player carries the ball

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

  /* ---------- Ball possession helpers ---------- */
  function getBallHolder() {
    const [bx, by] = board().tokens.ball;
    let closestId = null;
    let minDist = ATTACH_DIST;
    for (const t of TOKENS) {
      if (t.id === 'ball') continue;
      const [px, py] = board().tokens[t.id];
      const d = Math.hypot(bx - px, by - py);
      if (d < minDist) {
        minDist = d;
        closestId = t.id;
      }
    }
    return closestId;
  }

  function isBallBeingDragged() {
    for (const entry of active.values()) {
      if (entry.kind === 'drag' && entry.id === 'ball') return true;
    }
    return false;
  }

  /* ---------- Default lineups ---------- */
  function defaultPositions(mode) {
    const p = {};
    if (mode === 'full') {
      // Both teams in 2-3 zone defense defending their own basket (as in 2-3 zone diagram):
      // Left basket (x = 15.75, y = 75, FT line at x = 58): Blue team
      const blue = {
        1: [56, 55],    // top elbow (left guard)
        2: [56, 95],    // bottom elbow (right guard)
        3: [30, 38],    // top wing/block (left forward)
        4: [30, 112],   // bottom wing/block (right forward)
        5: [30, 75],    // center of paint in front of rim
      };
      for (const n in blue) {
        p['b' + n] = [...blue[n]];
        // Right basket (baseline at x = 280): Black team
        p['k' + n] = [Court.L - blue[n][0], blue[n][1]];
      }
      p.ball = [140, 75]; // center court
    } else {
      // Half court mode (basket at x = 75, y = 15.75):
      // My team (Blue) as defense team in 2-3 zone position:
      p.b1 = [54, 57];   // left elbow
      p.b2 = [96, 57];   // right elbow
      p.b3 = [38, 33];   // left wing/block
      p.b4 = [112, 33];  // right wing/block
      p.b5 = [75, 33];   // center of paint in front of rim

      // Offense team (Black) all stand outside the 3-point line:
      p.k1 = [75, 96];   // top of key
      p.k2 = [116, 80];  // right wing
      p.k3 = [34, 80];   // left wing
      p.k4 = [136, 50];  // right corner / deep wing
      p.k5 = [14, 50];   // left corner / deep wing
      p.ball = [75, 101.5]; // ball held by offensive point guard (k1) at top of key
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
        el('circle', { r: BALL_R + 1, fill: 'rgba(0,0,0,0)' }, inner); // exact touch target
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
    if (tokenEls.ball) tokenLayer.appendChild(tokenEls.ball);
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

      if (id === 'ball') {
        // Dragging the ball directly moves only the ball away
        active.set(e.pointerId, { kind: 'drag', id, dx: x - p.x, dy: y - p.y, hasBall: false });
        tokenLayer.appendChild(t); // bring ball to front
        t.querySelector('.inner').setAttribute('transform', 'scale(1.15)');
      } else {
        // Dragging a player token: check if player is carrying the ball
        const holder = getBallHolder();
        const hasBall = (holder === id);
        const [bx, by] = board().tokens.ball;

        active.set(e.pointerId, {
          kind: 'drag',
          id,
          dx: x - p.x,
          dy: y - p.y,
          hasBall,
          ballDx: bx - x,
          ballDy: by - y,
        });

        tokenLayer.appendChild(t); // bring player to front
        tokenLayer.appendChild(tokenEls.ball); // ensure ball is always on top of players
        t.querySelector('.inner').setAttribute('transform', 'scale(1.12)');
        if (hasBall) {
          tokenEls.ball.querySelector('.inner').setAttribute('transform', 'scale(1.15)');
        }
      }
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
      const newPos = clamp([p.x + a.dx, p.y + a.dy]);
      board().tokens[a.id] = newPos;
      placeToken(a.id);

      if (a.hasBall && !isBallBeingDragged()) {
        board().tokens.ball = clamp([newPos[0] + a.ballDx, newPos[1] + a.ballDy]);
        placeToken('ball');
      }
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
    if (a.kind === 'drag') {
      tokenEls[a.id]?.querySelector('.inner')?.removeAttribute('transform');
      if (a.hasBall) {
        tokenEls.ball?.querySelector('.inner')?.removeAttribute('transform');
      }
    }
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
    if (tokenEls.ball) tokenLayer.appendChild(tokenEls.ball);
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
