/* Board controller: tokens, drag & drop, collision, tracking, tools, strategies, persistence. */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const STORE = 'bcb-state-v5';
  const STRAT_STORE = 'bcb-strategies-v1';
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

  /* ---------- Default Preset Strategies ---------- */
  const DEFAULT_STRATEGIES = [
    {
      id: 'setup',
      name: 'Setup',
      mode: 'half',
      halfRole: 'offence',
      tokens: {
        b1: [42, 118],
        k1: [54, 80],
        ball: [33, 114],
        b3: [27, 23],
        k3: [39, 24],
        b5: [74, 68],
        k5: [75, 45],
        k4: [101, 43],
        b4: [112, 52],
        k2: [125, 56],
        b2: [140, 54],
      },
      strokes: [],
      tracks: [],
    },
    {
      id: 'open_for_1',
      name: '1v1 - 1',
      mode: 'half',
      halfRole: 'offence',
      tokens: {
        b1: [42, 118],
        k1: [46, 100],
        ball: [33, 114],
        b3: [7, 25],
        k3: [18, 30],
        b5: [104, 74],
        k5: [92, 72],
        k4: [101, 43],
        b4: [112, 52],
        k2: [125, 56],
        b2: [140, 54],
      },
      strokes: [
        {
          color: '#E53935',
          width: 1.6,
          arrow: true,
          marker: 'url(#arrowRed)',
          pts: [
            [36, 106],
            [37, 95],
            [39, 82],
            [43, 68],
            [49, 54],
            [58, 42],
            [66, 33],
            [73, 26],
          ],
        },
      ],
      tracks: [
        {
          color: '#1A1A1A',
          pts: [[54, 80], [51, 88], [48, 94], [46, 100]],
        },
        {
          color: '#1A1A1A',
          pts: [[75, 45], [82, 55], [88, 64], [92, 72]],
        },
        {
          color: '#00CED1',
          pts: [[74, 68], [84, 70], [94, 72], [104, 74]],
        },
        {
          color: '#00CED1',
          pts: [[27, 23], [17, 24], [7, 25]],
        },
        {
          color: '#1A1A1A',
          pts: [[39, 24], [28, 27], [18, 30]],
        },
      ],
    },
    {
      id: 'pick_and_roll_5_3_4',
      name: 'Pick&Roll - 5/3/4',
      mode: 'half',
      halfRole: 'offence',
      tokens: {
        b1: [95, 88],
        ball: [87, 84],
        k1: [54, 86],
        b5: [65, 90],
        k5: [79, 77],
        b3: [28, 25],
        k3: [40, 26],
        b4: [112, 38],
        k4: [103, 30],
        b2: [138, 57],
        k2: [123, 60],
      },
      strokes: [
        // Green arrow: 1 drives towards the key after using the screen
        {
          color: '#00C853',
          width: 1.6,
          arrow: true,
          marker: 'url(#arrowGreen)',
          pts: [
            [95, 78],
            [92, 70],
            [85, 62],
            [77, 57],
            [71, 54],
          ],
        },
        // Red arrow: 5 rolls directly to the hoop
        {
          color: '#E53935',
          width: 1.6,
          arrow: true,
          marker: 'url(#arrowRed)',
          pts: [
            [66, 78],
            [67, 62],
            [68, 44],
            [73, 26],
          ],
        },
        // Blue arrow: kick out pass to 3 on left wing
        {
          color: '#1E4FFF',
          width: 1.6,
          arrow: true,
          marker: 'url(#arrowBlue)',
          pts: [
            [62, 51],
            [51, 42],
            [41, 33],
          ],
        },
        // Blue arrow: kick out pass to 4 on right wing
        {
          color: '#1E4FFF',
          width: 1.6,
          arrow: true,
          marker: 'url(#arrowBlue)',
          pts: [
            [73, 47],
            [85, 43],
            [96, 40],
            [105, 39],
          ],
        },
      ],
      tracks: [
        // Cyan track: 1 dribble from Setup [42, 118] across to [95, 88]
        {
          color: '#00CED1',
          pts: [
            [42, 122],
            [54, 118],
            [67, 111],
            [79, 102],
            [90, 93],
            [95, 88],
          ],
        },
        // Cyan track: 5 moves from Setup [74, 68] to set pick at [65, 90]
        {
          color: '#00CED1',
          pts: [
            [74, 68],
            [71, 76],
            [68, 83],
            [65, 90],
          ],
        },
        // Black track: 5 drops on defense from Setup [75, 45] to [79, 77]
        {
          color: '#1A1A1A',
          pts: [
            [75, 45],
            [76, 55],
            [78, 67],
            [79, 77],
          ],
        },
        // Cyan track: 4 cuts from Setup [112, 52] to [112, 38]
        {
          color: '#00CED1',
          pts: [
            [112, 52],
            [113, 45],
            [112, 38],
          ],
        },
        // Black track: 4 follows from Setup [101, 43] to [103, 30]
        {
          color: '#1A1A1A',
          pts: [
            [101, 43],
            [102, 36],
            [103, 30],
          ],
        },
      ],
    },
  ];

  function loadStrategies() {
    let list = null;
    try {
      const data = JSON.parse(localStorage.getItem(STRAT_STORE));
      if (Array.isArray(data) && data.length > 0 && data[0]?.tokens) list = data;
    } catch {}

    if (!list) {
      return JSON.parse(JSON.stringify(DEFAULT_STRATEGIES));
    }

    // Migration: rename 'Open for 1' -> '1v1 - 1'
    const openFor1 = list.find((s) => s.id === 'open_for_1');
    if (openFor1 && openFor1.name === 'Open for 1') {
      openFor1.name = '1v1 - 1';
    }

    // Migration: ensure 'Pick&Roll - 5/3/4' is in the list
    if (!list.some((s) => s.id === 'pick_and_roll_5_3_4')) {
      const pnrPreset = DEFAULT_STRATEGIES.find((s) => s.id === 'pick_and_roll_5_3_4');
      if (pnrPreset) {
        list.push(JSON.parse(JSON.stringify(pnrPreset)));
      }
    }

    // Save migrated list
    try {
      localStorage.setItem(STRAT_STORE, JSON.stringify(list));
    } catch {}

    return list;
  }

  let strategies = loadStrategies();
  let currentStratId = strategies[0]?.id || 'setup';

  function saveStrategies() {
    try {
      localStorage.setItem(STRAT_STORE, JSON.stringify(strategies));
    } catch {}
  }

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
  function defaultPositions(mode, role = 'offence') {
    const p = {};
    if (mode === 'full') {
      const blue = {
        1: [56, 55],    // top elbow (left guard)
        2: [56, 95],    // bottom elbow (right guard)
        3: [30, 38],    // top wing/block (left forward)
        4: [30, 112],   // bottom wing/block (right forward)
        5: [30, 75],    // center of paint in front of rim
      };
      for (const n in blue) {
        p['b' + n] = [...blue[n]];
        p['k' + n] = [Court.L - blue[n][0], blue[n][1]];
      }
      p.ball = [140, 75]; // center court jump circle
    } else {
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
        for (const n in defZone) p['b' + n] = [...defZone[n]];
        for (const n in offPerimeter) p['k' + n] = [...offPerimeter[n]];
        p.ball = [75, 106];
      } else {
        for (const n in offPerimeter) p['b' + n] = [...offPerimeter[n]];
        for (const n in defZone) p['k' + n] = [...defZone[n]];
        p.ball = [75, 106];
      }
    }
    return p;
  }

  /* ---------- Move Aside (Outside Sidelines) ---------- */
  function asidePositions(mode) {
    const p = {};
    if (mode === 'full') {
      p.b1 = [50, -8];
      p.b2 = [75, -8];
      p.b3 = [100, -8];
      p.b4 = [125, -8];
      p.b5 = [150, -8];
      p.ball = [175, -8];

      p.k1 = [50, 158];
      p.k2 = [75, 158];
      p.k3 = [100, 158];
      p.k4 = [125, 158];
      p.k5 = [150, 158];
    } else {
      p.b1 = [-8, 25];
      p.b2 = [-8, 48];
      p.b3 = [-8, 71];
      p.b4 = [-8, 94];
      p.b5 = [-8, 117];
      p.ball = [-8, 137];

      p.k1 = [158, 25];
      p.k2 = [158, 48];
      p.k3 = [158, 71];
      p.k4 = [158, 94];
      p.k5 = [158, 117];
    }
    return p;
  }

  /* ---------- State ---------- */
  function freshBoard(mode, role = 'offence') {
    if (mode === 'half') {
      const s0 = strategies[0] || DEFAULT_STRATEGIES[0];
      const tokens = s0 && s0.tokens ? JSON.parse(JSON.stringify(s0.tokens)) : defaultPositions('half', role);
      const strokes = s0 && s0.strokes ? JSON.parse(JSON.stringify(s0.strokes)) : [];
      const tracks = s0 && s0.tracks ? JSON.parse(JSON.stringify(s0.tracks)) : [];
      return { tokens, strokes, tracks };
    }
    return { tokens: defaultPositions('full'), strokes: [], tracks: [] };
  }

  function loadState() {
    const fresh = {
      mode: 'half',
      halfRole: 'offence',
      showTrack: true,
      tool: 'move',
      color: '#E53935',
      boards: { full: freshBoard('full', 'defence'), half: freshBoard('half', 'offence') },
    };
    try {
      const s = JSON.parse(localStorage.getItem(STORE));
      if (!s || !s.boards) return fresh;
      s.mode = s.mode === 'full' ? 'full' : 'half';
      s.halfRole = s.halfRole === 'defence' ? 'defence' : 'offence';
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
        el('circle', { r: BALL_R + 1, fill: 'rgba(0,0,0,0)' }, inner);
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
  const pathD = Drawing.pathD;

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

  /* ---------- Strategy Management ---------- */
  function applyStrategy(stratId) {
    const s = strategies.find((item) => item.id === stratId);
    if (!s) return;
    currentStratId = stratId;
    state.mode = s.mode || 'half';
    if (s.halfRole) state.halfRole = s.halfRole;
    const b = board();
    b.tokens = JSON.parse(JSON.stringify(s.tokens));
    b.strokes = JSON.parse(JSON.stringify(s.strokes || []));
    b.tracks = JSON.parse(JSON.stringify(s.tracks || []));
    histories[state.mode] = [];
    render();
    if (tokenEls.ball) tokenLayer.appendChild(tokenEls.ball);
    save();
    updateStratSelect();
  }

  function updateStratSelect() {
    const sel = document.getElementById('stratSelect');
    if (!sel) return;
    sel.innerHTML = '';
    for (const s of strategies) {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      if (s.id === currentStratId) opt.selected = true;
      sel.appendChild(opt);
    }
  }

  function openSnapshotModal() {
    const modal = document.getElementById('snapshotModal');
    const input = document.getElementById('stratNameInput');
    if (!modal || !input) return;
    input.value = 'Play ' + (strategies.length + 1);
    modal.classList.add('active-modal');
    modal.style.display = 'flex';
    setTimeout(() => { input.focus(); input.select(); }, 50);
  }

  function closeSnapshotModal() {
    const modal = document.getElementById('snapshotModal');
    if (modal) {
      modal.classList.remove('active-modal');
      modal.style.display = 'none';
    }
  }

  function saveSnapshot() {
    const input = document.getElementById('stratNameInput');
    const name = (input ? input.value : '').trim() || ('Play ' + (strategies.length + 1));
    const newStrat = {
      id: 'strat_' + Date.now(),
      name,
      mode: state.mode,
      halfRole: state.halfRole,
      tokens: JSON.parse(JSON.stringify(board().tokens)),
      strokes: JSON.parse(JSON.stringify(board().strokes || [])),
      tracks: JSON.parse(JSON.stringify(board().tracks || [])),
    };
    strategies.push(newStrat);
    currentStratId = newStrat.id;
    saveStrategies();
    updateStratSelect();
    closeSnapshotModal();
    renderStratModalList();
  }

  /* Strategy Manager Modal */
  function openStratModal() {
    const modal = document.getElementById('stratModal');
    if (!modal) return;
    renderStratModalList();
    modal.classList.add('active-modal');
    modal.style.display = 'flex';
  }

  function closeStratModal() {
    const modal = document.getElementById('stratModal');
    if (modal) {
      modal.classList.remove('active-modal');
      modal.style.display = 'none';
    }
  }

  function renderStratModalList() {
    const list = document.getElementById('stratList');
    if (!list) return;
    list.innerHTML = '';

    strategies.forEach((s, idx) => {
      const item = document.createElement('div');
      item.className = 'strat-item' + (s.id === currentStratId ? ' active-strat' : '');
      item.dataset.id = s.id;

      // Reorder buttons (▲ / ▼)
      const orderBox = document.createElement('div');
      orderBox.className = 'strat-order-btns';
      const upBtn = document.createElement('button');
      upBtn.className = 'strat-order-btn';
      upBtn.textContent = '▲';
      upBtn.title = 'Move Up';
      upBtn.disabled = (idx === 0);
      upBtn.onclick = (e) => {
        e.stopPropagation();
        if (idx > 0) {
          const temp = strategies[idx - 1];
          strategies[idx - 1] = strategies[idx];
          strategies[idx] = temp;
          saveStrategies();
          updateStratSelect();
          renderStratModalList();
        }
      };

      const downBtn = document.createElement('button');
      downBtn.className = 'strat-order-btn';
      downBtn.textContent = '▼';
      downBtn.title = 'Move Down';
      downBtn.disabled = (idx === strategies.length - 1);
      downBtn.onclick = (e) => {
        e.stopPropagation();
        if (idx < strategies.length - 1) {
          const temp = strategies[idx + 1];
          strategies[idx + 1] = strategies[idx];
          strategies[idx] = temp;
          saveStrategies();
          updateStratSelect();
          renderStratModalList();
        }
      };
      orderBox.appendChild(upBtn);
      orderBox.appendChild(downBtn);

      // Info
      const info = document.createElement('div');
      info.className = 'strat-info';
      const nameRow = document.createElement('div');
      nameRow.className = 'strat-name-row';
      const title = document.createElement('span');
      title.className = 'strat-title';
      title.textContent = s.name;
      nameRow.appendChild(title);
      if (s.id === currentStratId) {
        const tag = document.createElement('span');
        tag.className = 'strat-tag';
        tag.textContent = 'Active';
        nameRow.appendChild(tag);
      }
      info.appendChild(nameRow);

      // Actions (Rename, Delete)
      const actions = document.createElement('div');
      actions.className = 'strat-item-actions';

      const renameBtn = document.createElement('button');
      renameBtn.className = 'strat-item-btn';
      renameBtn.textContent = '✏️ Rename';
      renameBtn.title = 'Rename strategy';
      renameBtn.onclick = (e) => {
        e.stopPropagation();
        const newName = prompt('Rename strategy:', s.name);
        if (newName && newName.trim()) {
          s.name = newName.trim();
          saveStrategies();
          updateStratSelect();
          renderStratModalList();
        }
      };

      const delBtn = document.createElement('button');
      delBtn.className = 'strat-item-btn btn-danger';
      delBtn.textContent = '🗑️';
      delBtn.title = 'Delete strategy';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        promptDeleteStrategy(s.id);
      };

      actions.appendChild(renameBtn);
      actions.appendChild(delBtn);

      // Progress bar for 3s hold gesture
      const bar = document.createElement('div');
      bar.className = 'hold-progress-bar';

      item.appendChild(orderBox);
      item.appendChild(info);
      item.appendChild(actions);
      item.appendChild(bar);

      // Tap on item selects it
      item.addEventListener('click', () => {
        applyStrategy(s.id);
        renderStratModalList();
      });

      // 3-second hold & slide to delete implementation
      setupHoldSlideDelete(item, s.id, bar);

      list.appendChild(item);
    });
  }

  function setupHoldSlideDelete(item, stratId, progressBar) {
    let holdTimer = null;
    let holdStartTime = 0;
    let animFrame = null;
    let startX = 0, startY = 0;

    function resetHold() {
      clearTimeout(holdTimer);
      cancelAnimationFrame(animFrame);
      holdTimer = null;
      progressBar.style.width = '0%';
    }

    item.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      startX = e.clientX;
      startY = e.clientY;
      holdStartTime = Date.now();

      function updateProgress() {
        const elapsed = Date.now() - holdStartTime;
        const pct = Math.min(100, (elapsed / 3000) * 100);
        progressBar.style.width = pct + '%';
        if (pct < 100 && holdTimer) {
          animFrame = requestAnimationFrame(updateProgress);
        }
      }
      animFrame = requestAnimationFrame(updateProgress);

      holdTimer = setTimeout(() => {
        resetHold();
        activateSlideDeleteBanner(item, stratId);
      }, 3000);
    });

    item.addEventListener('pointermove', (e) => {
      if (holdTimer && Math.hypot(e.clientX - startX, e.clientY - startY) > 8) {
        resetHold();
      }
    });

    item.addEventListener('pointerup', resetHold);
    item.addEventListener('pointercancel', resetHold);
  }

  function activateSlideDeleteBanner(item, stratId) {
    const existing = item.querySelector('.slide-delete-banner');
    if (existing) return;

    const banner = document.createElement('div');
    banner.className = 'slide-delete-banner';

    const slider = document.createElement('div');
    slider.className = 'slide-delete-slider';
    const text = document.createElement('div');
    text.className = 'slide-delete-text';
    text.textContent = 'Slide right to delete ➔';
    const handle = document.createElement('div');
    handle.className = 'slide-delete-handle';
    handle.textContent = '🗑️';

    slider.appendChild(text);
    slider.appendChild(handle);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'slide-delete-cancel-btn';
    cancelBtn.textContent = '✕';
    cancelBtn.onclick = (e) => { e.stopPropagation(); banner.remove(); };

    banner.appendChild(slider);
    banner.appendChild(cancelBtn);
    item.appendChild(banner);

    // Slide handle interaction
    let dragging = false;
    let handleStartX = 0;

    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      handleStartX = e.clientX;
      handle.setPointerCapture(e.pointerId);
      e.stopPropagation();
    });

    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = Math.max(0, e.clientX - handleStartX);
      const maxSlide = slider.offsetWidth - handle.offsetWidth - 4;
      handle.style.left = Math.min(dx + 2, maxSlide) + 'px';

      if (dx >= maxSlide - 10) {
        dragging = false;
        showConfirmButtonInBanner(banner, stratId);
      }
      e.stopPropagation();
    });

    function endHandle(e) {
      if (!dragging) return;
      dragging = false;
      handle.style.left = '2px';
      e.stopPropagation();
    }
    handle.addEventListener('pointerup', endHandle);
    handle.addEventListener('pointercancel', endHandle);
  }

  function showConfirmButtonInBanner(banner, stratId) {
    banner.innerHTML = '';
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'slide-delete-confirm-btn';
    confirmBtn.textContent = 'Click to Confirm Delete';
    confirmBtn.onclick = (e) => {
      e.stopPropagation();
      executeDeleteStrategy(stratId);
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'slide-delete-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = (e) => { e.stopPropagation(); banner.remove(); };

    banner.appendChild(confirmBtn);
    banner.appendChild(cancelBtn);
  }

  let pendingDeleteStratId = null;

  function promptDeleteStrategy(stratId) {
    if (strategies.length <= 1) {
      alert('You must keep at least one strategy.');
      return;
    }
    const s = strategies.find((item) => item.id === stratId);
    pendingDeleteStratId = stratId;
    const modal = document.getElementById('confirmModal');
    const text = document.getElementById('confirmModalText');
    if (text) text.textContent = `Are you sure you want to delete "${s ? s.name : 'this strategy'}"?`;
    if (modal) {
      modal.classList.add('active-modal');
      modal.style.display = 'flex';
    }
  }

  function executeDeleteStrategy(stratId) {
    if (strategies.length <= 1) {
      alert('You must keep at least one strategy.');
      return;
    }
    const idx = strategies.findIndex((s) => s.id === stratId);
    if (idx >= 0) {
      strategies.splice(idx, 1);
      if (currentStratId === stratId) {
        applyStrategy(strategies[0].id);
      } else {
        saveStrategies();
        updateStratSelect();
      }
      renderStratModalList();
    }
    const modal = document.getElementById('confirmModal');
    if (modal) {
      modal.classList.remove('active-modal');
      modal.style.display = 'none';
    }
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
        active.set(e.pointerId, {
          kind: 'drag', id, dx: x - p.x, dy: y - p.y, hasBall: false, track, trackPath,
        });
        tokenLayer.appendChild(t);
        t.querySelector('.inner').setAttribute('transform', 'scale(1.15)');
      } else {
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

        tokenLayer.appendChild(t);
        tokenLayer.appendChild(tokenEls.ball);
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
      const targetPos = [p.x + a.dx, p.y + a.dy];
      const newPos = resolveCollision(a.id, targetPos, a.hasBall ? 'ball' : null);
      board().tokens[a.id] = newPos;
      placeToken(a.id);

      if (a.track && a.trackPath) {
        const last = a.track.pts[a.track.pts.length - 1];
        if (Math.hypot(newPos[0] - last[0], newPos[1] - last[1]) >= 1.0) {
          a.track.pts.push([Math.round(newPos[0] * 10) / 10, Math.round(newPos[1] * 10) / 10]);
          a.trackPath.setAttribute('d', pathD(a.track.pts));
        }
      }

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

    updateStratSelect();
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
    state.tool = 'draw';
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

  /* Strategy Event Listeners */
  $('#stratSelect')?.addEventListener('change', (e) => {
    applyStrategy(e.target.value);
  });

  $('#stratCaptureBtn')?.addEventListener('click', openSnapshotModal);
  $('#stratManageBtn')?.addEventListener('click', openStratModal);

  $('#stratModalClose')?.addEventListener('click', closeStratModal);
  $('#stratModalDone')?.addEventListener('click', closeStratModal);
  $('#stratModalSnapshot')?.addEventListener('click', () => {
    closeStratModal();
    openSnapshotModal();
  });

  $('#snapshotModalClose')?.addEventListener('click', closeSnapshotModal);
  $('#snapshotModalCancel')?.addEventListener('click', closeSnapshotModal);
  $('#snapshotModalSave')?.addEventListener('click', saveSnapshot);

  const closeConfirmModal = () => {
    const modal = document.getElementById('confirmModal');
    if (modal) {
      modal.classList.remove('active-modal');
      modal.style.display = 'none';
    }
  };
  $('#confirmModalClose')?.addEventListener('click', closeConfirmModal);
  $('#confirmModalCancel')?.addEventListener('click', closeConfirmModal);
  $('#confirmModalOk')?.addEventListener('click', () => {
    if (pendingDeleteStratId) executeDeleteStrategy(pendingDeleteStratId);
  });

  /* ---------- Init ---------- */
  createTokens();
  // Apply initial strategy if board is fresh
  if (!localStorage.getItem(STORE)) {
    applyStrategy(currentStratId);
  } else {
    render();
  }

  new ResizeObserver(relayout).observe(svg);
  window.addEventListener('orientationchange', () => setTimeout(relayout, 300));

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
