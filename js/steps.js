// Contenido de cada paso de la demo.
// Cada paso tiene varios "fotogramas" (frames) que se recorren con ◀ ▶ o con Play.
// render(ctx, i) dibuja el fotograma i completo, así se puede ir hacia atrás sin problemas.
import { P, ACCOUNTS, TXS, DEMO_SEED } from './data.js';
import { computePoI, lottery, mulberry } from './poi.js';
import { fmt, pct, kcol, kname, dot, colorOf, legendHTML, makeView } from './ui.js';

const C = computePoI(ACCOUNTS, TXS, P);
const show = (ctx, view) => { ctx.graph.setAccounts(ACCOUNTS); ctx.graph.render(view); };
const list = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1] : a[0];
const yes = '<span class="tag ok">Sí</span>', no = '<span class="tag no">No</span>';

// ───────────────────────── Parte 1 · Calcular la importancia ─────────────────────────

const step11 = {
  sec: 1, tab: 'Quién participa', title: '¿Quién entra en el cálculo?',
  frames: () => 2,
  render(ctx, i) {
    const off = i >= 1;
    show(ctx, makeView(C, ACCOUNTS, { color: off ? 'neutral' : 'raw', sub: 'bal' }));
    ctx.text(off
      ? 'Solo cuentan las cuentas con <b>al menos 10.000 XEM consolidados</b>. Nico tiene saldo, pero no el suficiente: queda fuera del cálculo.'
      : 'Estas son las cuentas de nuestra red de ejemplo. El tamaño de cada círculo es su <b>saldo consolidado</b>.');
    ctx.viz.innerHTML = `<div class="tbl-wrap"><table>
      <tr><th>Cuenta</th><th class="n">Saldo consolidado</th><th>¿Participa?</th></tr>
      ${ACCOUNTS.map(a => `<tr class="${off && a.vest < P.MINB ? 'fade' : ''}"><td class="who">${a.id}</td><td class="n">${fmt(a.vest)} XEM</td>
        <td>${off ? (a.vest >= P.MINB ? yes : no) : ''}</td></tr>`).join('')}
    </table></div>`;
    ctx.legend(legendHTML(C, { kinds: false, neutral: true, off }));
    ctx.why(`<p>Los XEM que recibe una cuenta se consolidan poco a poco: un 10 % de lo pendiente cada día. Así no se gana importancia moviendo dinero de golpe.</p>`);
  },
};

// Pagos usados como ejemplo (índices en TXS)
const txIndex = (s, r) => TXS.findIndex(t => t[0] === s && t[1] === r);
const DISCARDED = C.status.map((st, k) => ({ st, k })).filter(x => x.st !== 'ok');
const REASON = { out: t => `${ACCOUNTS.find(a => a.id === t[0]).vest < P.MINB ? t[0] : t[1]} no participa`, old: () => 'más de 30 días', small: () => 'menos de 1.000 XEM', self: () => 'a sí misma' };
const ago = d => d === 0 ? 'hoy' : d === 1 ? 'hace 1 día' : `hace ${d} días`;
const payCell = t => `<b>${t[0]} → ${t[1]}</b><br><small>${fmt(t[2])} XEM · ${ago(t[3])}</small>`;

const step12 = {
  sec: 1, tab: 'Pagos', title: 'Los pagos del último mes',
  frames: () => 4,
  render(ctx, i) {
    const lk = TXS[txIndex('Lucía', 'Kike')], ca = TXS[txIndex('Carla', 'Ana')], ac = TXS[txIndex('Ana', 'Carla')];
    const wCA = ca[2] * Math.pow(P.DECAY, ca[3]);
    const extra = i === 2 ? DISCARDED.map(({ k }) => ({ key: 'x' + k, s: TXS[k][0], r: TXS[k][1], color: 'var(--bad)', width: 2, dashed: true })) : [];
    const edges = i === 0 ? 'none' : i === 1 ? ['Lucía>Kike', 'Carla>Ana'] : i === 2 ? 'none' : 'all';
    show(ctx, makeView(C, ACCOUNTS, { edges, extraEdges: extra, labels: i === 1 ? 'w' : '' }));
    ctx.legend(legendHTML(C, { kinds: false, neutral: true }));
    ctx.why('');
    if (i === 0) {
      ctx.text('Se leen las transferencias de los <b>últimos 30 días</b>. Entre dos cuentas hay <b>una sola arista</b> con el <b>flujo neto</b>: lo que una envía a la otra menos lo que recibe de ella. La flecha va de quien envía más a quien recibe más. Cada transferencia pesa menos con el tiempo.');
      ctx.viz.innerHTML = `<div class="formula">peso = XEM transferidos × 0,9<sup>días</sup></div>
        <p class="note">Cada día que pasa, una transferencia pesa un 10 % menos.</p>`;
    } else if (i === 1) {
      ctx.text('Ejemplos de pagos <b>válidos</b>.');
      ctx.viz.innerHTML = `<div class="tbl-wrap"><table><tr><th>Pago</th><th>Peso</th><th>¿Se usa?</th></tr>
        <tr><td>${payCell(lk)}</td><td>${fmt(lk[2])} × 0,9² = <b>${fmt(lk[2] * Math.pow(P.DECAY, lk[3]))}</b></td><td>${yes}</td></tr>
        <tr><td>${payCell(ca)}</td><td>${fmt(ca[2])} × 0,9³ = ${fmt(wCA)}</td><td rowspan="2">${yes}</td></tr>
        <tr><td>${payCell(ac)}</td><td>se resta lo que vuelve:<br>${fmt(wCA)} − ${fmt(ac[2])} = <b>${fmt(wCA - ac[2])}</b></td></tr>
      </table></div>
      <p class="note">Carla y Ana se pagan entre sí, así que se juntan en <b>una sola arista Carla → Ana</b> con peso <b>${fmt(wCA - ac[2])}</b>: ${fmt(wCA)} enviados por Carla − ${fmt(ac[2])} que devuelve Ana.</p>`;
    } else if (i === 2) {
      ctx.text('Pagos que <b>no son válidos</b>.');
      ctx.viz.innerHTML = `<div class="tbl-wrap"><table><tr><th>Pago</th><th>Motivo</th><th>¿Se usa?</th></tr>
        ${DISCARDED.map(({ st, k }) => `<tr><td>${payCell(TXS[k])}</td><td>${REASON[st](TXS[k])}</td><td>${no}</td></tr>`).join('')}
      </table></div>`;
    } else {
      ctx.text(`<b>${TXS.length} pagos leídos → ${C.M.length} aristas.</b>`);
      ctx.viz.innerHTML = '';
    }
  },
};

// Fotogramas de crecimiento de grupos: una oleada por fotograma
const WAVES = [];
C.groups.forEach(g => {
  let acc = [];
  g.waves.forEach((w, wi) => {
    const prev = acc.slice();
    acc = acc.concat(w);
    const from = wi === 0 ? [] : g.waves[wi - 1].filter(x => C.core.includes(x) && C.simset[x].some(y => w.includes(y)));
    const stopped = wi > 0 ? g.waves[wi - 1].filter(x => !C.core.includes(x)) : [];
    WAVES.push({ g, members: acc.slice(), prev, wave: w, wi, from, stopped, last: wi === g.waves.length - 1 });
  });
});

const step13 = {
  sec: 1, tab: 'Grupos', title: 'Buscar grupos de cuentas',
  frames: () => 2 + WAVES.length + 1,
  render(ctx, i) {
    const last = 2 + WAVES.length;
    ctx.why('');
    if (i === 0) {
      // Ejemplo de parecido: Hugo y Jorge comparten todos sus vecinos; Kike y Gema, casi ninguno
      const near = ['Gema', 'Hugo', 'Inés', 'Jorge', 'Kike', 'Lucía'];
      const edges = C.M.filter(e => near.includes(e.s) && near.includes(e.r)).map(e => e.s + '>' + e.r);
      show(ctx, makeView(C, ACCOUNTS, { edges, colorOverride: { Hugo: '#1B1F24', Jorge: '#1B1F24' }, dim: id => !near.includes(id) }));
      const nbs = a => list([...C.nb[a]].filter(x => x !== a).sort());
      ctx.text('Los <b>vecinos</b> de una cuenta son las cuentas con las que tiene una arista. Dos cuentas son <b>parecidas</b> si comparten muchos vecinos.');
      ctx.viz.innerHTML = `<p class="callout"><b>Hugo</b>: ${nbs('Hugo')}<br><b>Jorge</b>: ${nbs('Jorge')}<br>→ comparten todos → <b>muy parecidas</b></p>
        <p class="callout"><b>Kike</b>: ${nbs('Kike')}<br><b>Gema</b>: ${nbs('Gema')}<br>→ solo comparten la arista entre ellas → <b>se parecen menos</b></p>`;
      ctx.legend(legendHTML(C, { kinds: false, neutral: true }));
    } else if (i === 1) {
      show(ctx, makeView(C, ACCOUNTS, { edges: 'all', cores: true }));
      ctx.text('Una cuenta es <b>núcleo</b> si tiene <b>al menos 3 vecinos parecidos</b> (4 contándose a sí misma). Los núcleos son el centro de cada grupo: a partir de ellos crece el grupo.');
      ctx.viz.innerHTML = `<p class="callout">Núcleos: ${list(C.core)}.</p>`;
      ctx.legend(legendHTML(C, { kinds: false, neutral: true, ring: true }));
    } else if (i < last) {
      const W = WAVES[i - 2];
      const done = WAVES.slice(0, i - 1);
      const colorOverride = {}, hullMap = {};
      done.forEach(d => { d.members.forEach(id => (colorOverride[id] = kcol('g' + d.g.id))); hullMap[d.g.id] = d.members; });
      const hulls = Object.entries(hullMap).map(([gid, m]) => ({ members: m, color: kcol('g' + gid) }));
      show(ctx, makeView(C, ACCOUNTS, { edges: 'all', cores: true, colorOverride, hulls }));
      const G = `<b style="color:${kcol('g' + W.g.id)}">${kname('g' + W.g.id)}</b>`;
      let t;
      if (W.wi === 0) t = `Empezamos por el núcleo <b>${W.g.start}</b>: crea el ${G}.`;
      else if (W.wi === 1) t = `Entran los vecinos de ${list(W.from)}: <b>${list(W.wave)}</b>.`;
      else t = `${list(W.from)} también ${W.from.length > 1 ? 'son núcleos' : 'es núcleo'}: añade${W.from.length > 1 ? 'n' : ''} a <b>${list(W.wave)}</b>.`;
      if (W.last) {
        const used = new Set([W.g.start, ...WAVES.filter(x => x.g === W.g).flatMap(x => x.from)]);
        const idle = W.members.filter(x => C.core.includes(x) && !used.has(x));
        if (idle.length) t += ` ${list(idle)} también ${idle.length > 1 ? 'son núcleos' : 'es núcleo'}, pero todos sus vecinos ya están en el grupo, así que no ${idle.length > 1 ? 'añaden' : 'añade'} a nadie.`;
        t += ' El grupo está completo.';
      }
      ctx.text(t);
      ctx.viz.innerHTML = C.groups.map(gg => {
        const d = done.filter(x => x.g.id === gg.id).pop();
        return d ? `<p class="callout" style="border-color:${kcol('g' + gg.id)}"><b style="color:${kcol('g' + gg.id)}">${kname('g' + gg.id)}</b>: ${list(d.members)}</p>` : '';
      }).join('');
      ctx.legend(legendHTML(C, { kinds: false, neutral: true, ring: true }));
    } else {
      show(ctx, makeView(C, ACCOUNTS, { edges: 'all', edgeColor: 'kind', color: 'kind', sub: 'kind', hulls: true }));
      const hubs = C.el.filter(a => C.kind[a] === 'hub'), outs = C.el.filter(a => C.kind[a] === 'outlier');
      ctx.text('Quedan cuentas sin grupo. Las que conectan <b>dos o más grupos</b> son <b>hubs</b>; las que solo conectan con un grupo son <b>outliers</b>.');
      ctx.viz.innerHTML = `${hubs.length ? `<p class="callout" style="border-color:${kcol('hub')}"><b>${list(hubs)}</b>: hub (conecta el Grupo 1 y el Grupo 2)</p>` : ''}
        ${outs.length ? `<p class="callout" style="border-color:${kcol('outlier')}"><b>${list(outs)}</b>: outlier (solo conecta con un grupo)</p>` : ''}
        <p class="note">Al final, hubs y outliers cuentan un poco menos (× 0,9).</p>`;
      ctx.legend(legendHTML(C));
    }
  },
};

const RANK_FRAMES = Math.min(21, C.hist.length);
const step14 = {
  sec: 1, tab: 'Ranking', title: 'El ranking (NCDawareRank)', speed: 350,
  frames: () => RANK_FRAMES,
  enter(ctx) {
    ctx.viz.innerHTML = `<div class="ftext" id="iter"></div>
      <div class="bars" id="rbars">${C.el.map(a => `<div class="brow"><span class="who">${dot(C, a)}${a}</span><span class="btrack"><span class="bfill" data-a="${a}" style="background:${colorOf(C, a)};width:0"></span></span><span class="bval" data-v="${a}"></span></div>`).join('')}</div>
      <p class="note" id="rnote"></p>`;
  },
  render(ctx, i) {
    const vec = C.hist[i];
    show(ctx, makeView(C, ACCOUNTS, { edges: 'all', edgeColor: 'kind', color: 'kind', radius: 'rank', rankVec: vec, sub: 'rank', hulls: true }));
    ctx.text('Sirve para ver qué cuentas son más importantes: <b>hacia dónde fluye más el dinero</b>. Una cuenta sube si recibe mucho, y más aún si le pagan cuentas que también reciben mucho.');
    const max = Math.max(...Object.values(C.rank)) * 1.08;
    ctx.viz.querySelectorAll('.bfill').forEach(b => (b.style.width = (vec[b.dataset.a] / max * 100).toFixed(1) + '%'));
    ctx.viz.querySelectorAll('[data-v]').forEach(s => (s.textContent = pct(vec[s.dataset.v])));
    const last = i === RANK_FRAMES - 1;
    ctx.viz.querySelector('#iter').textContent = i === 0 ? `Iteración 0 · todas empiezan igual` : `Iteración ${i}`;
    ctx.viz.querySelector('#rnote').innerHTML = last ? 'A partir de aquí casi no cambia. Hugo y Gema salen arriba; Marta, que paga pero nadie le paga, sale la última.' : '';
    ctx.legend(legendHTML(C));
    ctx.why(`<p>En cada vuelta, cada cuenta reparte su valor: el 70 % entre las cuentas a las que paga, el 10 % dentro de su grupo y el 20 % entre todas por igual. Ese 20 % evita que un grupo que solo se paga entre sí se quede con todo.</p>`);
  },
};

const step15 = {
  sec: 1, tab: 'Importancia', title: 'Cálculo de la importancia',
  frames: () => 1,
  render(ctx) {
    const sorted = C.el.slice().sort((a, b) => C.imp[b] - C.imp[a]);
    const max = Math.max(...Object.values(C.imp)) * 1.05;
    ctx.why('');
    show(ctx, makeView(C, ACCOUNTS, { edges: 'all', edgeColor: 'kind', color: 'kind', radius: 'imp', sub: 'imp', hulls: true }));
    ctx.text('PoI junta el <b>saldo</b>, la <b>actividad</b> (lo que envía menos lo que recibe) y el <b>ranking</b>.');
    ctx.viz.innerHTML = `<div class="formula">importancia = ( (saldo + 1,25 × actividad) ÷ total + 0,1337 × ranking ) × χ</div>
      <p class="note">χ = 0,9 para hubs y outliers, 1 para el resto.</p>
      <div class="bars">${sorted.map(a => `<div class="brow"><span class="who">${dot(C, a)}${a}</span><span class="btrack"><span class="bfill" style="background:${colorOf(C, a)};width:${(C.imp[a] / max * 100).toFixed(1)}%"></span></span><span class="bval">${pct(C.imp[a])}</span></div>`).join('')}</div>`;
    ctx.legend(legendHTML(C));
  },
};

// ───────────────────────── Parte 2 · Quién crea el bloque ─────────────────────────

// Sorteo: hit_i = |ln U_i| (fijo), target_i(t) = importancia_i · t / 60 (crece con el tiempo).
// Gana la primera cuenta cuyo target alcanza su hit: t* = hit · 60 / importancia (igual que lottery()).
function drawFor(seed) {
  const d = lottery(C.imp, mulberry(seed));
  const hit = Object.fromEntries(d.map(x => [x.a, -Math.log(1 - x.u)]));
  const win = d[0];
  const axis = Math.max(Math.max(...C.el.map(a => C.imp[a] * win.t / 60)) * 2, hit[win.a] * 2.5);
  return { d, hit, win, axis };
}

function hitTargetSVG(D, t, showTarget) {
  const rows = C.el.slice().sort((a, b) => C.imp[b] - C.imp[a]);
  const W = 460, rh = 19, top = 20, x0 = 70, x1 = 440, H = top + rows.length * rh + 4;
  const X = v => x0 + Math.min(v, D.axis) / D.axis * (x1 - x0);
  let s = `<svg class="timeline" viewBox="0 0 ${W} ${H}" role="img" aria-label="Hit y target de cada cuenta">`;
  s += `<text x="${x0}" y="12" font-size="11" fill="#5F6B78"><tspan font-weight="700" fill="#1B1F24">t = ${Math.round(t)} s</tspan></text>`;
  rows.forEach((a, k) => {
    const y = top + k * rh, col = colorOf(C, a);
    const target = showTarget ? C.imp[a] * t / 60 : 0;
    const won = showTarget && a === D.win.a && t >= D.win.t - 1e-9;
    s += `<text x="${x0 - 8}" y="${y + 13}" font-size="11.5" font-weight="${won ? 700 : 500}" fill="#1B1F24" text-anchor="end">${a}</text>`;
    s += `<rect x="${x0}" y="${y + 4}" width="${x1 - x0}" height="12" rx="3" fill="#ECEFF2"/>`;
    if (target > 0) s += `<rect x="${x0}" y="${y + 4}" width="${X(target) - x0}" height="12" rx="3" fill="${col}" opacity="${won ? 1 : 0.85}"/>`;
    if (D.hit[a] <= D.axis) s += `<line x1="${X(D.hit[a])}" y1="${y + 1}" x2="${X(D.hit[a])}" y2="${y + 19}" stroke="#1B1F24" stroke-width="${won ? 3.5 : 2.5}"/>`;
    else s += `<text x="${x1 + 4}" y="${y + 14}" font-size="12" fill="#5F6B78">→</text>`;
    if (won) s += `<text x="${X(D.hit[a]) + 6}" y="${y + 14}" font-size="13" font-weight="700" fill="#1B1F24">★</text>`;
  });
  return s + '</svg>';
}

// Una sola cadena para el sorteo y la simulación, para que los bloques cuadren entre los dos pasos
const CHAIN = [{ h: 998, by: 'Gema' }, { h: 999, by: 'Lucía' }, { h: 1000, by: 'Ana' }];
const DRAW = { seed: DEMO_SEED, shown: false }; // shown: ya se ha visto quién gana este sorteo
const nextH = () => CHAIN[CHAIN.length - 1].h + 1;
// Guarda en la cadena el bloque del sorteo actual y prepara un sorteo nuevo para el siguiente bloque
function commitDraw() {
  CHAIN.push({ h: nextH(), by: drawFor(DRAW.seed).win.a });
  DRAW.seed = Math.floor(Math.random() * 1e9);
  DRAW.shown = false;
}

const CLOCK = 4; // fotogramas con el reloj avanzando antes de que gane alguien
const chainHTML = (chain, newH) => `<div class="chain">${chain.map(b => `<div class="blk ${b.h === newH ? 'new' : ''}" style="border-left:4px solid ${b.by ? colorOf(C, b.by) : 'var(--line)'}"><b>#${fmt(b.h)}</b><span>${b.by || '…'}</span></div>`).join('')}</div>`;

const step21 = {
  sec: 2, tab: 'El sorteo', title: '¿A quién le toca crear el bloque?', speed: 1300,
  frames: () => 2 + CLOCK + 1,
  render(ctx, i) {
    const D = drawFor(DRAW.seed), win = D.win;
    const h = nextH();
    const final = i === 2 + CLOCK;
    const t = i < 2 ? 0 : final ? win.t : win.t * (i - 1) / (CLOCK + 1);
    show(ctx, makeView(C, ACCOUNTS, { color: 'kind', radius: 'imp', sub: 'imp', win: final ? win.a : null, dim: final ? id => id !== win.a : null }));
    ctx.legend(legendHTML(C));
    ctx.why('');
    const texts = [
      'Todas las cuentas que participan pueden crear el siguiente bloque. Cuanta más importancia, más opciones.',
      'Cada cuenta calcula su <b>hit</b>: un número al azar que sale del hash del bloque anterior y de su clave. No se puede repetir para sacar otro.',
      'El <b>target</b> de cada cuenta crece con el tiempo, y más rápido cuanta más importancia tiene.',
      `<b>${win.a}</b> es la primera cuyo target alcanza su hit: crea el bloque #${fmt(h)}.`,
    ];
    ctx.text(i < 2 ? texts[i] : final ? texts[3] : texts[2]);
    if (final) DRAW.shown = true;
    const chain = CHAIN.concat([{ h, by: final ? win.a : null }]);
    ctx.viz.innerHTML = (i === 0
      ? `<div class="bars">${C.el.slice().sort((a, b) => C.imp[b] - C.imp[a]).map(a => `<div class="brow"><span class="who">${dot(C, a)}${a}</span><span class="btrack"><span class="bfill" style="background:${colorOf(C, a)};width:${(C.imp[a] / 0.2 * 100).toFixed(1)}%"></span></span><span class="bval">${pct(C.imp[a])}</span></div>`).join('')}</div>`
      : `<div class="formula">hit = 2<sup>54</sup> · |ln(h / 2<sup>256</sup>)|<br>target = 2<sup>64</sup> · b · t / d<br>Puede crear el bloque cuando <b>hit &lt; target</b></div>
        <p class="note">h: hash del bloque anterior con la clave de la cuenta (por eso el hit es fijo). b: importancia × 8.999.999.999 XEM. t: segundos desde el último bloque. d: dificultad, ajustada para que salga un bloque cada ~60 s.</p>
        <div id="tl">${hitTargetSVG(D, t, i >= 2)}</div>`)
      + `<div class="note">Cadena de bloques</div>${chainHTML(chain.slice(-6), final ? h : null)}`
      + (i >= 1 ? '<div class="btns"><button class="btn" id="again">↻ Otro sorteo</button></div>' : '');
    const again = ctx.viz.querySelector('#again');
    if (again) again.onclick = () => {
      if (final) commitDraw();
      else DRAW.seed = Math.floor(Math.random() * 1e9);
      ctx.go(1);
    };
  },
};

const step22 = {
  sec: 2, tab: 'Simular bloques', title: 'Simular la creación de bloques',
  frames: () => 1,
  enter(ctx) {
    ctx.state.wins = ctx.state.wins || Object.fromEntries(C.el.map(a => [a, 0]));
    ctx.state.total = ctx.state.total || 0;
    ctx.state.rng = ctx.state.rng || mulberry(12345);
    if (DRAW.shown) commitDraw(); // el bloque que ha salido en el sorteo pasa a la cadena
  },
  render(ctx) {
    const st = ctx.state;
    const draw = () => {
      const sorted = C.el.slice().sort((a, b) => C.imp[b] - C.imp[a]);
      const max = 0.22;
      show(ctx, makeView(C, ACCOUNTS, { color: 'kind', radius: 'imp', sub: Object.fromEntries(C.el.map(a => [a, st.wins[a] + ' bloques'])) }));
      ctx.viz.querySelector('#hb').innerHTML = sorted.map(a => {
        const share = st.total ? st.wins[a] / st.total : 0;
        return `<div class="brow"><span class="who">${dot(C, a)}${a}</span><span class="btrack"><span class="bfill" style="background:${colorOf(C, a)};width:${(share / max * 100).toFixed(1)}%"></span><span class="bfill ghost" style="width:${(C.imp[a] / max * 100).toFixed(1)}%"></span></span><span class="bval">${pct(share)} / ${pct(C.imp[a])}</span></div>`;
      }).join('');
      ctx.viz.querySelector('#tot').textContent = `${fmt(st.total)} bloques simulados`;
      ctx.viz.querySelector('#chain').innerHTML = `<div class="chain">${CHAIN.slice(-10).map(b => `<div class="blk" style="border-left:4px solid ${colorOf(C, b.by)}"><b>#${fmt(b.h)}</b><span>${b.by}</span></div>`).join('')}</div>`;
    };
    const sim = n => {
      for (let k = 0; k < n; k++) {
        const w = lottery(C.imp, st.rng)[0].a;
        st.wins[w]++; st.total++;
        CHAIN.push({ h: nextH(), by: w });
      }
      draw();
    };
    ctx.text('Barra de color: bloques creados por cada cuenta. Contorno: su importancia.');
    ctx.viz.innerHTML = `<div class="btns"><button class="btn" data-n="1">+1 bloque</button><button class="btn" data-n="10">+10</button><button class="btn" data-n="100">+100</button><button class="btn" data-n="1000">+1.000</button><button class="btn" id="rst">Reiniciar</button></div>
      <div class="ftext" id="tot"></div>
      <div class="bars pair" id="hb"></div>
      <div id="chain"></div>`;
    ctx.viz.querySelectorAll('[data-n]').forEach(b => (b.onclick = () => sim(+b.dataset.n)));
    ctx.viz.querySelector('#rst').onclick = () => { st.wins = Object.fromEntries(C.el.map(a => [a, 0])); st.total = 0; draw(); };
    draw();
    ctx.legend(legendHTML(C));
    ctx.why(`<p>La importancia se recalcula cada <b>${P.RECALC} bloques</b> (unas 6 horas).</p>`);
  },
};

export const SECTIONS = [
  { id: 1, name: 'Calcular la importancia' },
  { id: 2, name: 'Quién crea el bloque' },
];
export const STEPS = [step11, step12, step13, step14, step15, step21, step22];
