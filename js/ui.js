// Utilidades de formato y construcción de la "vista" del mapa.
import { KCOL, KNAME, OFF, NEUTRAL, P } from './data.js';

const grp = s => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const fmt = n => (n < 0 ? '−' : '') + grp(String(Math.round(Math.abs(n))));
export const dec = (x, d = 2) => (x < 0 ? '−' : '') + Math.abs(x).toFixed(d).replace('.', ',');
export const pct = (x, d = 1) => dec(x * 100, d) + ' %';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export const kcol = k => KCOL[k] || NEUTRAL;
export const kname = k => KNAME[k] || k;
export const colorOf = (comp, id) => comp.el.includes(id) ? kcol(comp.kind[id]) : OFF;
export const dot = (comp, id) => `<i class="dot" style="background:${colorOf(comp, id)}"></i>`;

export function legendHTML(comp, { kinds = true, off = true, ring = false, neutral = false } = {}) {
  const items = [];
  if (neutral) items.push(`<span><i style="background:${NEUTRAL}"></i>Participa</span>`);
  if (kinds) {
    const present = [...new Set(comp.el.map(a => comp.kind[a]))].sort();
    present.forEach(k => items.push(`<span><i style="background:${kcol(k)}"></i>${kname(k)}</span>`));
  }
  if (ring) items.push('<span><i class="ring"></i>Núcleo</span>');
  if (off) items.push('<span><i class="offd"></i>No participa</span>');
  return items.join('');
}

const rScale = (v, top) => 11 + Math.sqrt(Math.max(0, v) / top) * 27;

// Construye la vista del mapa a partir del resultado del cálculo.
// o.radius: 'bal' | 'rank' | 'imp' | objeto {id: valor}
// o.color:  'neutral' | 'kind' | 'raw' (todas iguales, sin filtrar)
// o.sub:    'bal' | 'kind' | 'rank' | 'imp' | objeto {id: texto}
// o.edges:  'none' | 'all' | array de claves "A>B"
export function makeView(comp, accounts, o = {}) {
  const by = Object.fromEntries(accounts.map(a => [a.id, a]));
  const raw = o.color === 'raw';
  const maxBal = Math.max(120000, ...accounts.map(a => a.vest));
  const vec = o.radius === 'rank' ? (o.rankVec || comp.rank) : o.radius === 'imp' ? comp.imp : typeof o.radius === 'object' ? o.radius : null;
  const top = vec ? Math.max(0.18, ...Object.values(vec)) : maxBal;
  const node = id => {
    const inEl = comp.el.includes(id);
    const off = !inEl && !raw;
    let color = NEUTRAL;
    if (off) color = OFF;
    else if (o.color === 'kind') color = kcol(comp.kind[id]);
    if (o.colorOverride && o.colorOverride[id]) color = o.colorOverride[id];
    const r = vec && inEl ? rScale(vec[id], top) : rScale(by[id].vest, maxBal);
    let sub = '';
    const s = o.sub || 'bal';
    if (typeof s === 'object') sub = s[id] ?? '';
    else if (s === 'bal') sub = fmt(by[id].vest) + ' XEM';
    else if (off) sub = 'fuera';
    else if (s === 'kind') sub = kname(comp.kind[id]);
    else if (s === 'rank') sub = pct((o.rankVec || comp.rank)[id]);
    else if (s === 'imp') sub = pct(comp.imp[id]);
    return {
      color, r, sub, off,
      dim: o.dim ? o.dim(id) : false,
      ring: o.cores && comp.core.includes(id),
      win: o.win === id,
    };
  };
  let edges = [];
  if (o.edges && o.edges !== 'none') {
    const keys = o.edges === 'all' ? null : new Set(o.edges);
    edges = comp.M.filter(e => !keys || keys.has(e.s + '>' + e.r)).map(e => {
      const s = comp.sim(e.s, e.r);
      return {
        key: e.s + '>' + e.r, s: e.s, r: e.r,
        color: o.edgeColor === 'kind' ? kcol(comp.kind[e.s]) : '#8C97A3',
        width: Math.min(7, 1.4 + e.v / 2200),
        label: o.labels === 'sim' ? dec(s) : o.labels === 'w' ? fmt(e.v) : '',
        labelColor: o.labels === 'sim' && s <= P.EPS ? 'var(--bad)' : 'var(--fg)',
      };
    });
  }
  if (o.extraEdges) edges = edges.concat(o.extraEdges);
  let hulls = [];
  if (o.hulls === true) hulls = comp.groups.map(g => ({ members: g.members, color: kcol('g' + g.id), label: kname('g' + g.id) }));
  else if (Array.isArray(o.hulls)) hulls = o.hulls;
  return { node, edges, hulls };
}
