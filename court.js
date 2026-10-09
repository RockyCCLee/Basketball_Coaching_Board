/* Court rendering. Units: 1 unit = 10 cm (FIBA court = 280 x 150). */
const Court = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const L = 280, W = 150;   // court length / width
  const M = 20;             // margin outside sidelines & baselines
  const HALF_EXTRA = 15;    // margin past the half-court line in half mode
  const LW = 0.7;           // line width
  const C = {
    apron: '#F0962E',
    line: '#1B2A6B',
    paint: '#2453A6',
    inLine: '#FFFFFF',
    rim: '#FF5A1F',
    board: '#FFFFFF',
  };

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  const line = (color = C.line, w = LW) => ({ fill: 'none', stroke: color, 'stroke-width': w });

  /** Visible content area (in SVG units) for each mode. */
  function bounds(mode) {
    return mode === 'full'
      ? { x: -M, y: -M, w: L + 2 * M, h: W + 2 * M }
      : { x: -M, y: -M, w: W + 2 * M, h: L / 2 + M + HALF_EXTRA };
  }

  /** One basket end, drawn with the baseline at x = 0. */
  function drawEnd(g) {
    const by = W / 2, bx = 15.75;

    // Key / paint
    el('rect', { x: 0, y: by - 24.5, width: 58, height: 49, fill: C.paint, stroke: C.line, 'stroke-width': LW }, g);
    for (const x of [17.5, 26, 34.5, 43]) {
      el('line', { x1: x, y1: by - 24.5, x2: x, y2: by - 26.5, ...line() }, g);
      el('line', { x1: x, y1: by + 24.5, x2: x, y2: by + 26.5, ...line() }, g);
    }

    // Free-throw circle: solid outside the key, dashed inside
    el('path', { d: `M58 ${by - 18} A18 18 0 0 1 58 ${by + 18}`, ...line() }, g);
    el('path', { d: `M58 ${by + 18} A18 18 0 0 1 58 ${by - 18}`, ...line(C.inLine), 'stroke-dasharray': '2.5 2' }, g);

    // 3-point line (corner 0.9 m from sideline, 6.75 m arc)
    const cy = 9;
    const cx = bx + Math.sqrt(67.5 ** 2 - (by - cy) ** 2);
    el('path', { d: `M0 ${cy} L${cx} ${cy} A67.5 67.5 0 0 1 ${cx} ${W - cy} L0 ${W - cy}`, ...line() }, g);

    // Restricted area
    el('path', { d: `M12 ${by - 12.5} L${bx} ${by - 12.5} A12.5 12.5 0 0 1 ${bx} ${by + 12.5} L12 ${by + 12.5}`, ...line(C.inLine) }, g);

    // Backboard + hoop
    el('line', { x1: 12, y1: by - 9, x2: 12, y2: by + 9, stroke: C.board, 'stroke-width': 1.4, 'stroke-linecap': 'round' }, g);
    el('line', { x1: 12, y1: by, x2: 13.5, y2: by, stroke: C.rim, 'stroke-width': 0.7 }, g);
    el('circle', { cx: bx, cy: by, r: 2.25, fill: 'rgba(255,255,255,0.25)', stroke: C.rim, 'stroke-width': 0.8 }, g);
  }

  function draw(layer, mode) {
    layer.replaceChildren();
    // Apron / margin fills the whole screen
    el('rect', { x: -2000, y: -2000, width: 4000, height: 4000, fill: C.apron }, layer);

    // Half court: transpose so the basket is at the top of the screen
    const g = el('g', mode === 'half' ? { transform: 'matrix(0 1 1 0 0 0)' } : {}, layer);
    const len = mode === 'full' ? L : L / 2;

    el('rect', { x: 0, y: 0, width: len, height: W, fill: 'url(#wood)' }, g);
    drawEnd(g);

    if (mode === 'full') {
      drawEnd(el('g', { transform: `matrix(-1 0 0 1 ${L} 0)` }, g));
      el('line', { x1: L / 2, y1: 0, x2: L / 2, y2: W, ...line() }, g);
      el('circle', { cx: L / 2, cy: W / 2, r: 18, ...line() }, g);
      el('circle', { cx: L / 2, cy: W / 2, r: 6, fill: C.paint, stroke: C.line, 'stroke-width': LW }, g);
      el('rect', { x: 0, y: 0, width: L, height: W, ...line(C.line, 1) }, g);
    } else {
      el('path', { d: `M${len} ${W / 2 - 18} A18 18 0 0 0 ${len} ${W / 2 + 18}`, ...line() }, g);
      el('rect', { x: 0, y: 0, width: len, height: W, ...line(C.line, 1) }, g);
    }
  }

  return { draw, bounds, L, W };
})();
