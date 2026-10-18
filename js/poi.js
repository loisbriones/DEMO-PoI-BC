// Cálculo de la importancia de PoI, siguiendo el algoritmo de NEM (NIS1):
//   1. cuentas elegibles  2. grafo de pagos netos  3. grupos SCAN
//   4. ranking NCDawareRank  5. fórmula final.
// Función pura: no toca el DOM, se puede probar con node.

export function computePoI(accounts, txs, P) {
  const by = Object.fromEntries(accounts.map(a => [a.id, a]));

  // 1. Solo participan cuentas con saldo consolidado suficiente
  const el = accounts.filter(a => a.vest >= P.MINB).map(a => a.id);
  const isEl = id => el.includes(id);

  // 2. Pagos: al menos MINL XEM, ventana de DAYS días, peso que decae, neteo por pareja
  const status = txs.map(([s, r, a, d]) => {
    if (s === r) return 'self';
    if (a < P.MINL) return 'small';
    if (d > P.DAYS) return 'old';
    if (!isEl(s) || !isEl(r)) return 'out';
    return 'ok';
  });
  const w = {};
  txs.forEach(([s, r, a, d], i) => {
    if (status[i] === 'ok') w[s + '>' + r] = (w[s + '>' + r] || 0) + a * Math.pow(P.DECAY, d);
  });
  const net = [];
  Object.keys(w).forEach(k => {
    const [s, r] = k.split('>');
    const n = w[k] - (w[r + '>' + s] || 0);
    if (n > 0) net.push({ s, r, v: n });
  });
  // Actividad neta: lo que sale menos lo que entra
  const sig = Object.fromEntries(el.map(a => [a, 0]));
  net.forEach(e => { sig[e.s] += e.v; sig[e.r] -= e.v; });
  // Enlaces que cuentan para el grafo
  const M = net.filter(e => e.v >= P.MINL);

  // 3. SCAN: parecido estructural, núcleos y grupos
  const nb = Object.fromEntries(el.map(a => [a, new Set([a])]));
  M.forEach(e => { nb[e.s].add(e.r); nb[e.r].add(e.s); });
  const sim = (u, v) => {
    let c = 0;
    nb[u].forEach(x => { if (nb[v].has(x)) c++; });
    return c / Math.sqrt(nb[u].size * nb[v].size);
  };
  const simset = {};
  el.forEach(u => { simset[u] = [u, ...[...nb[u]].filter(v => v !== u && sim(u, v) > P.EPS)]; });
  const core = el.filter(u => simset[u].length >= P.MU);
  const label = {};
  const groups = [];
  el.forEach(c0 => {
    if (!core.includes(c0) || label[c0]) return;
    const g = { id: groups.length + 1, start: c0, waves: [[c0]], members: [c0] };
    label[c0] = g.id;
    let frontier = [c0];
    while (frontier.length) {
      const wave = [];
      frontier.forEach(x => {
        if (!core.includes(x)) return;
        simset[x].forEach(y => { if (!label[y]) { label[y] = g.id; wave.push(y); g.members.push(y); } });
      });
      if (wave.length) g.waves.push(wave);
      frontier = wave;
    }
    groups.push(g);
  });
  // Sin grupo: hub si toca 2 o más grupos, outlier si no
  const kind = {};
  el.forEach(a => {
    if (label[a]) { kind[a] = 'g' + label[a]; return; }
    const cl = new Set([...nb[a]].filter(b => label[b]).map(b => label[b]));
    kind[a] = cl.size > 1 ? 'hub' : 'outlier';
  });

  // 4. NCDawareRank: el "billete" que salta de cuenta en cuenta
  const blk = Object.fromEntries(el.map(a => [a, kind[a].startsWith('g') ? kind[a] : a]));
  const members = {};
  el.forEach(a => (members[blk[a]] = members[blk[a]] || []).push(a));
  const outsum = Object.fromEntries(el.map(a => [a, M.filter(e => e.s === a).reduce((t, e) => t + e.v, 0)]));
  const chi = Object.fromEntries(el.map(u => [u, [...new Set([blk[u], ...M.filter(e => e.s === u).map(e => blk[e.r])])]]));
  const N = el.length || 1;
  let p = Object.fromEntries(el.map(a => [a, 1 / N]));
  const hist = [p];
  for (let it = 0; it < 300; it++) {
    const q = Object.fromEntries(el.map(a => [a, P.TELE / N]));
    const dang = el.filter(a => outsum[a] === 0).reduce((t, a) => t + p[a], 0) * P.ETA / N;
    el.forEach(a => (q[a] += dang));
    M.forEach(e => (q[e.r] += P.ETA * p[e.s] * e.v / outsum[e.s]));
    el.forEach(u => chi[u].forEach(b => members[b].forEach(j => (q[j] += P.MUR * p[u] / chi[u].length / members[b].length))));
    const diff = el.reduce((t, a) => t + Math.abs(q[a] - p[a]), 0);
    p = q;
    hist.push(p);
    if (diff < 1e-10) break;
  }
  const rank = p;

  // 5. Fórmula final
  const adj = Object.fromEntries(el.map(a => [a, P.WO * sig[a] * (sig[a] < 0 ? P.NEG : 1)]));
  const base = Object.fromEntries(el.map(a => [a, Math.max(0, by[a].vest + adj[a])]));
  const tb = el.reduce((t, a) => t + base[a], 0) || 1;
  const tv = el.reduce((t, a) => t + by[a].vest, 0) || 1;
  const chiw = Object.fromEntries(el.map(a => [a, kind[a].startsWith('g') ? 1 : P.CHI]));
  const raw = Object.fromEntries(el.map(a => [a, (base[a] / tb + P.WI * rank[a]) * chiw[a]]));
  const tr = el.reduce((t, a) => t + raw[a], 0) || 1;
  const imp = Object.fromEntries(el.map(a => [a, raw[a] / tr]));
  const pos = Object.fromEntries(el.map(a => [a, by[a].vest / tv]));

  return { el, status, w, net, sig, M, nb, sim, simset, core, groups, kind, rank, hist, adj, base, tb, tv, chiw, raw, tr, imp, pos };
}

// Generador pseudoaleatorio con semilla (para que el sorteo sea repetible)
export function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Sorteo de harvesting: cada cuenta obtiene un "momento" = azar × dificultad ÷ importancia.
// Gana la primera. Con tiempos exponenciales, P(ganar) = importancia.
export function lottery(imp, rng, target = 60) {
  return Object.keys(imp)
    .map(a => ({ a, u: rng(), t: 0 }))
    .map(d => ({ ...d, t: -Math.log(1 - d.u) * target / imp[d.a] }))
    .sort((x, y) => x.t - y.t);
}
