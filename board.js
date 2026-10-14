/* Board controller: tokens, drag & drop, collision, tracking, tools, persistence. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const STORE = 'bcb-state-v4';
  const R = 6;              // player token radius (0.6 m)
  const BALL_R = 4;         // basketball token radius (0.4 m)
  const ATTACH_DIST = 10.8; // distance within which a player carries the ball (touching = 10)

  const svg = document.getElementById('board');
  const courtLayer = document.getElementById('courtLayer');
  const trackLayer = document.getElementById('trackLayer');
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
  function defaultPositions(mode, role = state.halfRole) {
    const p = {};
    if (mode === 'full') {
      // Both teams in 2-3 zone defense defending their own basket (as in Page-001.jpg):
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
      p.ball = [140, 75]; // center court jump circle
    } else {
      // Half court mode (basket at x = 75, y = 15.75):
      const defZone = {
        1: [54, 57],   // left elbow
        2: [96, 57],   // right elbow
        3: [38, 33],   // left wing/block
        4: [112, 33],  // right wing/block
        5: [75, 33],   // center of paint in front of rim
      };
      const offPerimeter = {
        1: [75, 96],   // top of key
        2: [116, 80],  // right wing
        3: [34, 80],   // left wing
        4: [136, 50],  // right corner / deep wing
        5: [14, 50],   // left corner / deep wing
      };

      if (role === 'defence') {
        // Our team (Blue) is Defence (2-3 zone); Opponent (Black) is Offence
        for (const n in defZone) p['b' + n] = [...defZone[n]];
        for (const n in offPerimeter) p['k' + n] = [...offPerimeter[n]];
        // Ball starts holding by no. 1 offensive player (k1)
        p.ball = [75, 106]; // touching k1 at dist = 10, no overlap
      } else {
        // Our team (Blue) is Offence; Opponent (Black) is Defence (2-3 zone)
        for (const n in offPerimeter) p['b' + n] = [...offPerimeter[n]];
        for (const n in defZone) p['k' + n] = [...defZone[n]];
        // Ball starts holding by no. 1 offensive player (b1)
        p.ball = [75, 106]; // touching b1 at dist = 10, no overlap
      }
    }
    return p;
  }

  /* ---------- Move Aside (Outside Sidelines) ---------- */
  function asidePositions(mode) {
    const p = {};
    if (mode === 'full') {
      // Top sideline is y = 0; bottom sideline is y = 150.
      // Margin extends to y = -20 and y = 170.
      // Blue team outside top sideline:
      p.b1 = [50, -8];
      p.b2 = [75, -8];
      p.b3 = [100, -8];
      p.b4 = [125, -8];
      p.b5 = [150, -8];
      p.ball = [175, -8];

      // Black team outside bottom sideline:
      p.k1 = [50, 158];
      p.k2 = [75, 158];
      p.k3 = [100, 158];
      p.k4 = [125, 158];
      p.k5 = [150, 158];
    } else {
      // Left sideline is x = 0; right sideline is x = 150.
      // Margin extends to x = -20 and x = 170.
      // Blue team outside left sideline:
      p.b1 = [-8, 25];
      p.b2 = [-8, 48];
      p.b3 = [-8, 71];
      p.b4 = [-8, 94];
      p.b5 = [-8, 117];
      p.ball = [-8, 137];

      // Black team outside right sideline:
      p.k1 = [158, 25];
      p.k2 = [158, 48];
      p.k3 = [158, 71];
      p.k4 = [158, 94];
      p.k5 = [158, 117];
    }
    return p;
  }

  /* ---------- State ---------- */
  function freshBoard(mode, role = 'defence') {
    return { tokens: defaultPositions(mode, role), strokes: [], tracks: [] };
  }

  function loadState() {
    const fresh = {
      mode: 'full',
      halfRole: 'defence',
      showTrack: true,
      tool: 'move',
      color: '#E53935',
      boards: { full: freshBoard('full', 'defence'), half: freshBoard('half', 'defence') },
    };
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (!s || !s.boards) return fresh;
      s.mode = s.mode === 'half' ? 'half' : 'full';
      s.halfRole = s.halfRole === 'offence' ? 'offence' : 'defence';
      s.showTrack = s.showTrack !== false;
      s.tool = s.tool || 'move';
      s.color = s.color || fresh.color;
      for (const m of ['full', 'half']) {
        const b = s.boards[m] || freshBoard(m, s.halfRole);
        const defs = defaultPositions(m, s.halfRole);
        b.tokens = { ...defs, ...(b.tokens || {}) };
        b.strokes = Array.isArray(b.strokes) ? b.strokes : [];
        b.tracks = Array.isArray(b.tracks) ? b.tracks : [];
        s.boards[m] = b;
      }
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

  /* ---------- Collision Detection (No Overlap) ---------- */
  function resolveCollision(id, target, ignoreId = null) {
    const rA = (id === 'ball' ? BALL_R : R);
    let [x, y] = target;

    for (let iter = 0; iter < 5; iter++) {
      for (const t of TOKENS) {
        if (t.id === id) continue;
        if (ignoreId && t.id === ignoreId) continue;

        const rB = (t.id === 'ball' ? BALL_R : R);
        const minDist = rA + rB;
        const [ox, oy] = board().tokens[t.id];
        let dx = x - ox;
        let dy = y - oy;
        let d = Math.hypot(dx, dy);

        if (d < minDist) {
          if (d === 0) {
            dx = 1;
            dy = 0;
            d = 0.001;
          }
          const push = minDist / d;
          x = ox + dx * push;
          y = oy + dy * push;
        }
      }
      [x, y] = clamp([x, y]);
    }
    return [x, y];
  }

  function resolveAllCollisions() {
    const b = board().tokens;
    for (let iter = 0; iter < 6; iter++) {
      for (let i = 0; i < TOKENS.length; i++) {
        const idA = TOKENS[i].id;
        const rA = (idA === 'ball' ? BALL_R : R);
        for (let j = i + 1; j < TOKENS.length; j++) {
          const idB = TOKENS[j].id;
          const rB = (idB === 'ball' ? BALL_R : R);
          const minDist = rA + rB;
          const dx = b[idA][0] - b[idB][0];
          const dy = b[idA][1] - b[idB][1];
          const d = Math.hypot(dx, dy);
          if (d < minDist) {
            const overlap = minDist - (d || 0.01);
            const nx = (dx || 1) / (d || 1);
            const ny = dy / (d || 1);
            b[idA][0] += nx * overlap * 0.5;
            b[idA][1] += ny * overlap * 0.5;
            b[idB][0] -= nx * overlap * 0.5;
            b[idB][1] -= ny * overlap * 0.5;
          }
        }
        b[idA] = clamp(b[idA]);
      }
    }
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
    resolveAllCollisions();
    placeTokens();
  }

  /* ---------- Breaking Line Tracks ---------- */
  function pathD(pts) {
    if (!pts || !pts.length) return '';
    if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]} L${pts[0][0] + 0.01} ${pts[0][1]}`;
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      d += ` Q${x1} ${y1} ${(x1 + x2) / 2} ${(y1 + y2) / 2}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L${last[0]} ${last[1]}`;
  }

  function tokenTrackColor(id) {
    if (id === 'ball') return '#F07A1A';
    if (id.startsWith('b')) return '#00CED1';
    return '#1A1A1A';
  }

  function renderTracks() {
    trackLayer.replaceChildren();
    for (const tr of board().tracks) {
      if (!tr.pts || tr.pts.length < 2) continue;
      el('path', {
        d: pathD(tr.pts),
        fill: 'none',
        stroke: tr.color,
        'stroke-width': 1.4,
        'stroke-dasharray': '3.5 2.5',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        opacity: '0.85',
      }, trackLayer);
    }
  }

  function render() {
    Court.draw(courtLayer, state.mode);
    relayout();
    renderTracks();
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

      // Prepare track if enabled
      let track = null, trackPath = null;
      if (state.showTrack) {
        track = {
          color: tokenTrackColor(id),
          pts: [[Math.round(x * 10) / 10, Math.round(y * 10) / 10]],
        };
        trackPath = el('path', {
          d: pathD(track.pts),
          fill: 'none',
          stroke: track.color,
          'stroke-width': 1.4,
          'stroke-dasharray': '3.5 2.5',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          opacity: '0.85',
        }, trackLayer);
      }

      if (id === 'ball') {
        // Dragging the ball directly moves only the ball away
        active.set(e.pointerId, {
          kind: 'drag', id, dx: x - p.x, dy: y - p.y, hasBall: false, track, trackPath,
        });
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
          track,
          trackPath,
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
      // Non-overlapping collision resolution:
      const targetPos = [p.x + a.dx, p.y + a.dy];
      const newPos = resolveCollision(a.id, targetPos, a.hasBall ? 'ball' : null);
      board().tokens[a.id] = newPos;
      placeToken(a.id);

      // Record track
      if (a.track && a.trackPath) {
        const last = a.track.pts[a.track.pts.length - 1];
        if (Math.hypot(newPos[0] - last[0], newPos[1] - last[1]) >= 1.0) {
          a.track.pts.push([Math.round(newPos[0] * 10) / 10, Math.round(newPos[1] * 10) / 10]);
          a.trackPath.setAttribute('d', pathD(a.track.pts));
        }
      }

      // Move carried ball along
      if (a.hasBall && !isBallBeingDragged()) {
        const desiredBall = [newPos[0] + a.ballDx, newPos[1] + a.ballDy];
        board().tokens.ball = resolveCollision('ball', desiredBall, a.id);
        placeToken('ball');
      }
    } else if (state.tool === 'draw') {
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
      // Finalize track
      if (a.track && a.trackPath) {
        const pts = a.track.pts;
        const totalDist = pts.length >= 2 ? Math.hypot(pts[pts.length - 1][0] - pts[0][0], pts[pts.length - 1][1] - pts[0][1]) : 0;
        if (pts.length >= 2 && totalDist >= 2.0) {
          board().tracks.push(a.track);
          hist().push({ type: 'track', track: a.track, el: a.trackPath });
        } else {
          a.trackPath.remove();
        }
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

    // Role button (only shown in half-court mode)
    const roleBtn = $('#roleBtn');
    if (roleBtn) {
      if (state.mode === 'half') {
        roleBtn.style.display = 'inline-flex';
        const isDef = state.halfRole === 'defence';
        roleBtn.textContent = isDef ? '🛡️ We: Defence' : '⚡ We: Offence';
        roleBtn.classList.toggle('role-defence', isDef);
        roleBtn.classList.toggle('role-offence', !isDef);
      } else {
        roleBtn.style.display = 'none';
      }
    }

    // Track toggle button
    const trackBtn = $('#trackToggleBtn');
    if (trackBtn) {
      trackBtn.classList.toggle('active', state.showTrack);
      trackBtn.textContent = state.showTrack ? '👣 Track: ON' : '👣 Track: OFF';
    }

    svg.classList.remove('tool-move', 'tool-draw', 'tool-erase');
    svg.classList.add('tool-' + state.tool);
    tokenLayer.classList.toggle('inert', state.tool !== 'move');

    $('#undoBtn').disabled = hist().length === 0;
    $('#clearBtn').disabled = (board().strokes.length === 0 && board().tracks.length === 0);
  }

  $('#modeSeg').addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]')?.dataset.mode;
    if (!m || m === state.mode) return;
    state.mode = m;
    render();
    save();
  });

  $('#roleBtn')?.addEventListener('click', () => {
    state.halfRole = (state.halfRole === 'defence' ? 'offence' : 'defence');
    board().tokens = defaultPositions('half', state.halfRole);
    relayout();
    if (tokenEls.ball) tokenLayer.appendChild(tokenEls.ball);
    updateUI();
    save();
  });

  $('#trackToggleBtn')?.addEventListener('click', () => {
    state.showTrack = !state.showTrack;
    updateUI();
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
    const last = hist()[hist().length - 1];
    if (last && last.type === 'track') {
      hist().pop();
      const trIndex = board().tracks.indexOf(last.track);
      if (trIndex >= 0) board().tracks.splice(trIndex, 1);
      if (last.el && last.el.parentNode) last.el.remove();
      renderTracks();
    } else {
      Drawing.undo(board().strokes, hist());
    }
    updateUI();
    save();
  });

  $('#clearBtn').addEventListener('click', () => {
    Drawing.clear(board().strokes, hist());
    board().tracks = [];
    renderTracks();
    updateUI();
    save();
  });

  $('#asideBtn')?.addEventListener('click', () => {
    board().tokens = asidePositions(state.mode);
    relayout();
    if (tokenEls.ball) tokenLayer.appendChild(tokenEls.ball);
    save();
  });

  $('#resetBtn').addEventListener('click', () => {
    board().tokens = defaultPositions(state.mode, state.halfRole);
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
