// Dibujo del mapa de cuentas en SVG: nodos, flechas de pago y zonas de grupo.
// Se le pasa una "vista" (qué color, tamaño y texto tiene cada cosa) y la dibuja;
// los cambios de tamaño se animan suavemente.

const NS = 'http://www.w3.org/2000/svg';
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function mk(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

// Curva entre dos puntos (control desplazado para que A→B y B→A no se pisen)
function curve(A, B, bend = 18) {
  const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
  return { cx: (A.x + B.x) / 2 - dy / len * bend, cy: (A.y + B.y) / 2 + dx / len * bend };
}

function edgeGeom(A, B, rA, rB) {
  const c = curve(A, B);
  const v1x = c.cx - A.x, v1y = c.cy - A.y, l1 = Math.hypot(v1x, v1y) || 1;
  const v2x = B.x - c.cx, v2y = B.y - c.cy, l2 = Math.hypot(v2x, v2y) || 1;
  const sx = A.x + v1x / l1 * (rA + 2), sy = A.y + v1y / l1 * (rA + 2);
  const ex = B.x - v2x / l2 * (rB + 4), ey = B.y - v2y / l2 * (rB + 4);
  const ux = v2x / l2, uy = v2y / l2;
  return {
    d: `M${sx},${sy} Q${c.cx},${c.cy} ${ex - ux * 6},${ey - uy * 6}`,
    head: `M${ex},${ey} L${ex - ux * 10 - uy * 5.5},${ey - uy * 10 + ux * 5.5} L${ex - ux * 10 + uy * 5.5},${ey - uy * 10 - ux * 5.5}Z`,
    mx: 0.25 * A.x + 0.5 * c.cx + 0.25 * B.x,
    my: 0.25 * A.y + 0.5 * c.cy + 0.25 * B.y,
  };
}

// Envolvente convexa (para dibujar la zona de cada grupo)
function hull(pts) {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length < 3) return P;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  P.forEach(p => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
  P.slice().reverse().forEach(p => { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); });
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

export class Graph {
  constructor(svg) {
    this.svg = svg;
    this.L = {};
    ['hulls', 'edges', 'labels', 'accs'].forEach(k => (this.L[k] = mk('g', {}, svg)));
    this.nodes = new Map();
    this.edges = new Map();
    this.edgeData = [];
    requestAnimationFrame(t => this.tick(t));
  }

  setAccounts(accounts) {
    const keep = new Set(accounts.map(a => a.id));
    for (const [id, n] of this.nodes) if (!keep.has(id)) { n.g.remove(); this.nodes.delete(id); }
    accounts.forEach(a => {
      let n = this.nodes.get(a.id);
      if (!n) {
        const g = mk('g', { class: 'acc' }, this.L.accs);
        n = {
          id: a.id, g, r: 14, tr: 14,
          ring: mk('circle', { class: 'core' }, g),
          win: mk('circle', { class: 'win' }, g),
          c: mk('circle', { class: 'main' }, g),
          t: mk('text', { class: 'init' }, g),
          nm: mk('text', { class: 'nname' }, g),
          sb: mk('text', { class: 'nsub' }, g),
          star: mk('text', { class: 'star' }, g),
        };
        n.t.textContent = a.id[0];
        n.nm.textContent = a.id;
        this.nodes.set(a.id, n);
      }
      n.x = a.x; n.y = a.y;
      [n.ring, n.win, n.c].forEach(c => { c.setAttribute('cx', a.x); c.setAttribute('cy', a.y); });
      n.t.setAttribute('x', a.x); n.t.setAttribute('y', a.y);
      n.nm.setAttribute('x', a.x); n.sb.setAttribute('x', a.x);
      this.place(n);
    });
  }

  place(n) {
    n.c.setAttribute('r', n.r.toFixed(2));
    n.ring.setAttribute('r', (n.r + 6).toFixed(2));
    n.win.setAttribute('r', (n.r + 5).toFixed(2));
    n.nm.setAttribute('y', (n.y + n.r + 16).toFixed(1));
    n.sb.setAttribute('y', (n.y + n.r + 30).toFixed(1));
    n.star.setAttribute('x', n.x + n.r * 0.8 + 8);
    n.star.setAttribute('y', n.y - n.r * 0.8 - 6);
  }

  // view.node(id) → { color, r, sub, off, dim, ring, win }
  // view.edges   → [{ key, s, r, color, width, label, labelColor, dashed }]
  // view.hulls   → [{ members, color, label }]
  render(view) {
    for (const [id, n] of this.nodes) {
      const v = view.node(id);
      n.g.classList.toggle('off', !!v.off);
      n.g.classList.toggle('dim', !!v.dim);
      n.c.style.fill = v.color;
      n.tr = v.r;
      n.sb.textContent = v.sub || '';
      n.ring.style.display = v.ring ? '' : 'none';
      n.win.style.display = v.win ? '' : 'none';
      n.star.textContent = v.win ? '★' : '';
      n.star.style.fill = v.color;
    }
    this.renderEdges(view.edges || []);
    this.renderHulls(view.hulls || []);
  }

  renderEdges(list) {
    const keep = new Set(list.map(e => e.key));
    for (const [k, e] of this.edges) if (!keep.has(k)) { e.g.remove(); e.lg.remove(); this.edges.delete(k); }
    list.forEach(d => {
      let e = this.edges.get(d.key);
      if (!e) {
        const g = mk('g', { class: 'edge' }, this.L.edges);
        const lg = mk('g', {}, this.L.labels);
        e = { g, p: mk('path', {}, g), h: mk('path', {}, g), lg, bg: mk('rect', { class: 'elab-bg', rx: 3, width: 32, height: 16 }, lg), t: mk('text', { class: 'elab' }, lg) };
        this.edges.set(d.key, e);
      }
      e.d = d;
      e.g.classList.toggle('dashed', !!d.dashed);
      e.p.style.stroke = d.color; e.h.style.fill = d.color;
      e.p.style.strokeWidth = d.width || 2;
      e.lg.style.display = d.label ? '' : 'none';
      e.t.textContent = d.label || '';
      e.t.style.fill = d.labelColor || 'var(--fg)';
    });
    this.layoutEdges();
  }

  layoutEdges() {
    for (const e of this.edges.values()) {
      const A = this.nodes.get(e.d.s), B = this.nodes.get(e.d.r);
      if (!A || !B) continue;
      const g = edgeGeom(A, B, A.r, B.r);
      e.p.setAttribute('d', g.d); e.h.setAttribute('d', g.head);
      if (e.d.label) {
        e.t.setAttribute('x', g.mx); e.t.setAttribute('y', g.my);
        e.bg.setAttribute('x', g.mx - 16); e.bg.setAttribute('y', g.my - 8);
      }
    }
  }

  renderHulls(list) {
    this.L.hulls.replaceChildren();
    list.forEach(h => {
      const pts = h.members.map(id => this.nodes.get(id)).filter(Boolean).map(n => [n.x, n.y]);
      if (!pts.length) return;
      const hp = hull(pts);
      const d = hp.length === 1 ? `M${hp[0][0]},${hp[0][1]}Z` : 'M' + hp.map(p => p.join(',')).join(' L') + 'Z';
      const p = mk('path', { d, 'stroke-width': 78, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: 0.13 }, this.L.hulls);
      p.style.fill = h.color; p.style.stroke = h.color;
    });
  }

  tick() {
    let moved = false;
    for (const n of this.nodes.values()) {
      if (Math.abs(n.r - n.tr) > 0.05) {
        n.r += (n.tr - n.r) * (reduce ? 1 : 0.18);
        this.place(n);
        moved = true;
      }
    }
    if (moved) this.layoutEdges();
    requestAnimationFrame(t => this.tick(t));
  }
}
