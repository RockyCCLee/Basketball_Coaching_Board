/* Freehand drawing: pen, stroke eraser, undo, clear. */
const Drawing = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const WIDTH = 1.3;        // stroke width (SVG units)
  const MIN_STEP = 0.6;     // min distance between sampled points
  const ERASE_TOL = 3;      // eraser hit radius
  const els = new WeakMap(); // stroke -> <path>
  let layer = null;

  const r1 = (v) => Math.round(v * 10) / 10;

  function pathD(pts) {
    if (pts.length === 1) {
      const [x, y] = pts[0];
      return `M${x} ${y} L${x + 0.01} ${y}`;
    }
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      d += ` Q${x1} ${y1} ${(x1 + x2) / 2} ${(y1 + y2) / 2}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L${last[0]} ${last[1]}`;
  }

  function makePath(stroke) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', pathD(stroke.pts));
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', stroke.color);
    p.setAttribute('stroke-width', WIDTH);
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    els.set(stroke, p);
    return p;
  }

  function render(l, strokes) {
    layer = l;
    layer.replaceChildren(...strokes.map(makePath));
  }

  function begin(strokes, hist, pt, color) {
    const s = { color, pts: [[r1(pt.x), r1(pt.y)]] };
    strokes.push(s);
    layer.appendChild(makePath(s));
    hist.push({ type: 'add', stroke: s });
    return s;
  }

  function extend(s, pt) {
    const last = s.pts[s.pts.length - 1];
    if (Math.hypot(pt.x - last[0], pt.y - last[1]) < MIN_STEP) return;
    s.pts.push([r1(pt.x), r1(pt.y)]);
    els.get(s).setAttribute('d', pathD(s.pts));
  }

  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  function hit(s, x, y) {
    const p = s.pts;
    if (p.length === 1) return Math.hypot(x - p[0][0], y - p[0][1]) < ERASE_TOL;
    for (let i = 0; i < p.length - 1; i++) {
      if (distSeg(x, y, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]) < ERASE_TOL) return true;
    }
    return false;
  }

  function eraseAt(strokes, hist, pt) {
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (hit(strokes[i], pt.x, pt.y)) {
        const [s] = strokes.splice(i, 1);
        els.get(s)?.remove();
        hist.push({ type: 'erase', stroke: s, index: i });
      }
    }
  }

  function undo(strokes, hist) {
    const a = hist.pop();
    if (!a) return;
    if (a.type === 'add') {
      const i = strokes.indexOf(a.stroke);
      if (i >= 0) strokes.splice(i, 1);
    } else if (a.type === 'erase') {
      strokes.splice(Math.min(a.index, strokes.length), 0, a.stroke);
    } else if (a.type === 'clear') {
      strokes.unshift(...a.strokes);
    }
    render(layer, strokes);
  }

  function clear(strokes, hist) {
    if (!strokes.length) return;
    hist.push({ type: 'clear', strokes: strokes.splice(0) });
    render(layer, strokes);
  }

  return { render, begin, extend, eraseAt, undo, clear };
})();
