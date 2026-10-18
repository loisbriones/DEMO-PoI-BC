// Reproductor: navegación por secciones, pasos y fotogramas (◀ ▶ ⏯), teclado y enlaces #1.3
import { Graph } from './graph.js';
import { STEPS, SECTIONS } from './steps.js';

const $ = s => document.querySelector(s);
const graph = new Graph($('#svg'));
const viz = $('#viz');

let step = 0, frame = 0, playing = null, token = 0;
const states = STEPS.map(() => ({}));
const nFrames = () => STEPS[step].frames();

const ctx = {
  graph, viz, state: null,
  text: html => ($('#stext').innerHTML = html),
  legend: html => ($('#legend').innerHTML = html),
  why: html => { $('#whybody').innerHTML = html; $('#why').hidden = !html; },
  token: () => token,
  alive: t => t === token,
  go: i => showFrame(i),
};

// Secciones (pestañas de arriba)
SECTIONS.forEach(s => {
  const b = document.createElement('button');
  b.innerHTML = `<span class="n">${s.id}</span>${s.name}`;
  b.dataset.sec = s.id;
  b.onclick = () => goStep(STEPS.findIndex(x => x.sec === s.id));
  $('#sections').appendChild(b);
});

function goStep(n, f = 0) {
  stop();
  step = Math.max(0, Math.min(STEPS.length - 1, n));
  const s = STEPS[step];
  ctx.state = states[step];
  $('#stitle').textContent = s.title;
  const inSec = STEPS.map((x, i) => [x, i]).filter(([x]) => x.sec === s.sec);
  $('#eyebrow').textContent = `${SECTIONS[s.sec - 1].name} · paso ${inSec.findIndex(([, i]) => i === step) + 1} de ${inSec.length}`;
  $('#steps').innerHTML = inSec.map(([x, i]) => `<button data-i="${i}" ${i === step ? 'aria-current="step"' : ''} class="${i < step ? 'done' : ''}">${x.tab}</button>`).join('');
  $('#steps').querySelectorAll('button').forEach(b => (b.onclick = () => goStep(+b.dataset.i)));
  $('#sections').querySelectorAll('button').forEach(b => b.setAttribute('aria-current', +b.dataset.sec === s.sec ? 'true' : 'false'));
  $('#why').open = false;
  viz.replaceChildren();
  if (s.enter) s.enter(ctx);
  showFrame(f);
  history.replaceState(null, '', `#${s.sec}.${inSec.findIndex(([, i]) => i === step) + 1}`);
}

function showFrame(f) {
  token++;
  const n = nFrames();
  frame = Math.max(0, Math.min(n - 1, f));
  STEPS[step].render(ctx, frame);
  updatePlayer();
}

function updatePlayer() {
  const n = nFrames();
  const prog = $('#prog');
  if (n <= 1) prog.innerHTML = '';
  else if (n <= 14) {
    prog.innerHTML = `<div class="dots">${Array.from({ length: n }, (_, i) => `<i class="${i <= frame ? 'on' : ''}" data-f="${i}" title="Fotograma ${i + 1}"></i>`).join('')}</div><span class="ftext">${frame + 1} / ${n}</span>`;
    prog.querySelectorAll('[data-f]').forEach(d => (d.onclick = () => { stop(); showFrame(+d.dataset.f); }));
  } else {
    prog.innerHTML = `<div class="bar"><span style="width:${(frame / (n - 1) * 100).toFixed(1)}%"></span></div><span class="ftext">${frame + 1} / ${n}</span>`;
  }
  $('#prev').disabled = step === 0 && frame === 0;
  $('#next').disabled = step === STEPS.length - 1 && frame === n - 1;
  $('#play').disabled = n <= 1;
  $('#play').innerHTML = playing ? '⏸ Pausa' : '▶ Reproducir';
  $('#play').setAttribute('aria-pressed', playing ? 'true' : 'false');
}

function next() {
  if (frame < nFrames() - 1) showFrame(frame + 1);
  else if (step < STEPS.length - 1) goStep(step + 1);
}
function prev() {
  if (frame > 0) showFrame(frame - 1);
  else if (step > 0) goStep(step - 1, Infinity);
}
function stop() { if (playing) { clearInterval(playing); playing = null; updatePlayer(); } }
function play() {
  if (playing) return stop();
  if (frame >= nFrames() - 1) showFrame(0);
  playing = setInterval(() => {
    if (frame >= nFrames() - 1) return stop();
    showFrame(frame + 1);
  }, STEPS[step].speed || 1600);
  updatePlayer();
}

$('#prev').onclick = () => { stop(); prev(); };
$('#next').onclick = () => { stop(); next(); };
$('#play').onclick = play;
$('#restart').onclick = () => { stop(); showFrame(0); };

document.addEventListener('keydown', e => {
  if (e.target.closest('input, select, textarea')) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); stop(); next(); }
  else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); stop(); prev(); }
  else if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); play(); }
  else if (SECTIONS.some(x => String(x.id) === e.key)) goStep(STEPS.findIndex(x => x.sec === +e.key));
});

// Enlace directo: demo/#2.1 → sección 2, paso 1
function fromHash() {
  const m = location.hash.match(/^#(\d)(?:\.(\d+))?/);
  if (!m) return 0;
  const inSec = STEPS.map((x, i) => [x, i]).filter(([x]) => x.sec === +m[1]);
  const k = Math.max(0, Math.min(inSec.length - 1, (+m[2] || 1) - 1));
  return inSec.length ? inSec[k][1] : 0;
}
window.addEventListener('hashchange', () => { const n = fromHash(); if (n !== step) goStep(n); });
goStep(fromHash());
