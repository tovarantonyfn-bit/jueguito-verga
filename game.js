'use strict';

// ============================================================
//  QUE NO ME FUMEN — un porro huyendo de una mano que lo quiere fumar
// ============================================================

const W = 320, H = 180, GROUND = 150;
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false;

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------
//  Sprites (pixel art definido como texto)
// ------------------------------------------------------------
const PAL = {
  K: '#1b1424', W: '#f3ecdc', w: '#cfc3a8', G: '#6dbb4f', g: '#3f7a34',
  T: '#d9a45b', t: '#a8743a', E: '#ffffff', S: '#b8bed0', s: '#6d7389',
  B: '#4fb3ff', b: '#2b6fd1', P: '#ffffff',
};

function makeSprite(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      const col = pal[r[x]];
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
  });
  return c;
}

const PORRO_TOP = [
  '.....KK.....',
  '....KWWK....',
  '.....KWK....',
  '....KWWWK...',
  '...KWWWWK...',
  '..KWWWWWwK..',
];
const PORRO_BOTTOM = [
  '..KWWWWWwK..',
  '..KWWKWWwK..',
  '..KWWWWWwK..',
  '..KWGWWWwK..',
  '..KWWWWGwK..',
  '..KWWWWWwK..',
  '..KWGWWWwK..',
  '..KTTTTTtK..',
  '..KTtTTTtK..',
  '..KTTTTTtK..',
  '..KKKKKKKK..',
];
const face = (a, b, bottom = PORRO_BOTTOM) => [...PORRO_TOP, a, b, ...bottom];
const SPR = {
  porro:  makeSprite(face('..KEEWEEwK..', '..KEKWEKwK..'), PAL),
  blink:  makeSprite(face('..KWWWWWwK..', '..KKKWKKwK..'), PAL),
  scared: makeSprite(face('..KEEWEEwK..', '..KKEWKEwK..', [
    '..KWWWWWwK..', '..KWWKWWwK..', '..KWWKWWwK..', ...PORRO_BOTTOM.slice(3)]), PAL),
  stoned: makeSprite(face('..KKKWKKwK..', '..KEKWEKwK..', [
    '..KWWWWWwK..', '..KWKKKWwK..', ...PORRO_BOTTOM.slice(2)]), PAL),
};

function lighterSprite(body, shade) {
  return makeSprite([
    '.KKKK.',
    'KSSSsK',
    'KSsSsK',
    'KKKKKK',
    'KRRRrK',
    'KRPRrK',
    'KRRRrK',
    'KRRRrK',
    'KRRRrK',
    'KRRRrK',
    'KRRRrK',
    'KKKKKK',
  ], { ...PAL, R: body, r: shade });
}
const LIGHTERS = [
  lighterSprite('#e2352f', '#9c1f2a'),
  lighterSprite('#2f8de2', '#1f4f9c'),
  lighterSprite('#3fbf5a', '#21753a'),
  lighterSprite('#ffd23f', '#c48a1d'),
];

SPR.ashtray = makeSprite([
  '.KKKKKKKKKKKKKK.',
  'KSSsSSSSSSSSsSSK',
  'KsSSSSSSSSSSSSsK',
  '.KsSSSSSSSSSSsK.',
  '.KssSSSSSSSSssK.',
  '..KKKKKKKKKKKK..',
], PAL);

SPR.leaf = makeSprite([
  '....g....',
  '...gGg...',
  'g..gGg..g',
  'gG.gGg.Gg',
  '.gGgGgGg.',
  '..gGGGg..',
  '.gG.g.Gg.',
  '....g....',
  '....g....',
], PAL);

SPR.drop = makeSprite([
  '...K...',
  '..KBK..',
  '..KBK..',
  '.KBBBK.',
  'KBEBBbK',
  'KBEBBbK',
  'KBBBBbK',
  '.KbbbK.',
  '..KKK..',
], PAL);

// ------------------------------------------------------------
//  Fondo (cielo, luna, ciudad)
// ------------------------------------------------------------
function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

const SKY = (() => {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bands = ['#120c22', '#1a1030', '#24143e', '#33184a', '#481d55', '#5e2459'];
  const bh = Math.ceil(GROUND / bands.length);
  bands.forEach((col, i) => {
    g.fillStyle = col; g.fillRect(0, i * bh, W, bh);
    // dithering entre bandas
    if (i > 0) {
      g.fillStyle = col;
      for (let x = 0; x < W; x += 2) { g.fillRect(x, i * bh - 2, 1, 1); g.fillRect(x + 1, i * bh - 1, 1, 1); }
    }
  });
  const r = seeded(7);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = r() < 0.2 ? '#ffd9f0' : '#cfc3e8';
    g.fillRect(Math.floor(r() * W), Math.floor(r() * 90), 1, 1);
  }
  // luna pixelada
  const mx = 260, my = 30, mr = 13;
  for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) {
    const d = x * x + y * y;
    if (d <= mr * mr) {
      g.fillStyle = d > (mr - 1.5) ** 2 ? '#d8cfa8' : '#f5eec8';
      g.fillRect(mx + x, my + y, 1, 1);
    }
  }
  g.fillStyle = '#d8cfa8';
  [[-4, -3, 3], [3, 4, 2], [5, -5, 2], [-3, 6, 2]].forEach(([x, y, s]) => g.fillRect(mx + x, my + y, s, s));
  return c;
})();

function makeSkyline(w, h, seed, col, winCol, minH, maxH, winChance) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const r = seeded(seed);
  let x = 0;
  while (x < w - 12) {
    const bw = Math.min(Math.floor(14 + r() * 26), w - x);
    const bh = Math.floor(minH + r() * (maxH - minH));
    g.fillStyle = col;
    g.fillRect(x, h - bh, bw, bh);
    if (r() < 0.35) g.fillRect(x + Math.floor(bw / 2) - 1, h - bh - 7, 2, 7);
    if (r() < 0.25) g.fillRect(x + 2, h - bh - 3, bw - 4, 3);
    for (let wy = h - bh + 4; wy < h - 4; wy += 5) {
      for (let wx = x + 3; wx < x + bw - 3; wx += 4) {
        if (r() < winChance) {
          g.fillStyle = r() < 0.15 ? '#ff6fae' : winCol;
          g.fillRect(wx, wy, 2, 2);
          g.fillStyle = col;
        }
      }
    }
    x += bw + Math.floor(r() * 4);
  }
  return c;
}
const FAR = makeSkyline(480, 90, 11, '#2a1840', '#6b4f8a', 30, 80, 0.25);
const NEAR = makeSkyline(480, 70, 23, '#1b1129', '#ffcf6a', 20, 60, 0.18);

// ------------------------------------------------------------
//  La mano (dibujada con rectángulos para poder animarla)
// ------------------------------------------------------------
const SKIN = '#e9b48a', SKIN_D = '#c3855d', NAIL = '#f8d9c4';
const SLEEVE = '#6a3fa0', SLEEVE_D = '#47286f', CUFF = '#8d63c9', OUT = '#1b1424';
const FINGERS = [15, 18, 17, 13];

function fingerLen(i, grip) { return Math.max(3, Math.round(FINGERS[i] * (1 - 0.8 * grip))); }
function handReach(grip) { return fingerLen(1, grip); }

// Mano apuntando hacia +x; (0,0) es la base de los dedos. rot = Math.PI/2 apunta hacia abajo.
function drawHand(x, y, grip, rot = 0) {
  grip = clamp(grip, 0, 1);
  const rects = [
    [-460, -11, 426, 22, SLEEVE],
    [-34, -12, 8, 24, CUFF],
    [-26, -9, 6, 18, SKIN],
    [-22, -14, 22, 28, SKIN],
    [-16, -20, 9, 8, SKIN],
    [-10, Math.round(-22 + grip * 6), 10 - Math.round(grip * 4), 6, SKIN],
  ];
  for (let i = 0; i < 4; i++) rects.push([0, -14 + i * 7, fingerLen(i, grip), 6, SKIN]);

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (rot) ctx.rotate(rot);
  ctx.fillStyle = OUT;
  for (const r of rects) ctx.fillRect(r[0] - 1, r[1] - 1, r[2] + 2, r[3] + 2);
  for (const r of rects) { ctx.fillStyle = r[4]; ctx.fillRect(r[0], r[1], r[2], r[3]); }
  // detalles
  ctx.fillStyle = SLEEVE_D; ctx.fillRect(-460, 5, 426, 6);
  ctx.fillStyle = SKIN_D;
  ctx.fillRect(-22, 11, 22, 3);
  ctx.fillRect(-26, 6, 6, 3);
  for (let i = 0; i < 4; i++) {
    const L = fingerLen(i, grip), fy = -14 + i * 7;
    ctx.fillStyle = SKIN_D; ctx.fillRect(0, fy + 5, L, 1);
    if (L > 6) { ctx.fillRect(4, fy + 1, 1, 3); ctx.fillStyle = NAIL; ctx.fillRect(L - 3, fy + 1, 2, 3); }
  }
  ctx.restore();
}

// ------------------------------------------------------------
//  Audio (sintetizado, sin archivos)
// ------------------------------------------------------------
let actx = null, muted = false;
function initAudio() {
  if (actx) return;
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
}
function beep(freq, dur, type = 'square', vol = 0.06, slide = 0, delay = 0) {
  if (!actx || muted) return;
  const t = actx.currentTime + delay;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(actx.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
const SFX = {
  jump: () => beep(330, 0.12, 'square', 0.05, 300),
  jump2: () => beep(440, 0.12, 'square', 0.05, 400),
  leaf: () => { beep(880, 0.06, 'square', 0.04); beep(1320, 0.08, 'square', 0.04, 0, 0.05); },
  drop: () => { beep(600, 0.1, 'triangle', 0.08, 500); beep(900, 0.15, 'triangle', 0.06, 600, 0.08); },
  hit: () => beep(160, 0.25, 'sawtooth', 0.08, -100),
  warn: () => beep(220, 0.08, 'square', 0.04),
  swoop: () => beep(500, 0.2, 'sawtooth', 0.06, -400),
  caught: () => { beep(300, 0.2, 'square', 0.07, -150); beep(200, 0.4, 'square', 0.07, -120, 0.2); },
  flick: () => beep(1800, 0.05, 'square', 0.04, -1200),
  inhale: () => beep(120, 1.0, 'sawtooth', 0.025, 60),
};

// ------------------------------------------------------------
//  Entrada
// ------------------------------------------------------------
const keys = { left: false, right: false, down: false, jump: false };
let jumpPressed = false;

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowDown: 'down', KeyS: 'down', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
};

addEventListener('keydown', (e) => {
  initAudio();
  const k = KEYMAP[e.code];
  if (k) {
    e.preventDefault();
    if (k === 'jump' && !keys.jump) onJumpPress();
    keys[k] = true;
  }
  if (e.code === 'Enter' && (state.mode === 'title' || state.mode === 'over')) startGame();
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyM') muted = !muted;
});
addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) keys[k] = false;
});

function onJumpPress() {
  if (state.mode === 'title' || (state.mode === 'over' && state.overT > 0.6)) { startGame(); return; }
  if (state.mode === 'playing') jumpPressed = true;
}

// Táctil
const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
document.querySelectorAll('#touch button').forEach((btn) => {
  const k = btn.dataset.k;
  const on = (e) => { e.preventDefault(); initAudio(); if (k === 'jump' && !keys.jump) onJumpPress(); keys[k] = true; btn.classList.add('on'); };
  const off = (e) => { e.preventDefault(); keys[k] = false; btn.classList.remove('on'); };
  btn.addEventListener('pointerdown', on);
  btn.addEventListener('pointerup', off);
  btn.addEventListener('pointercancel', off);
  btn.addEventListener('pointerleave', off);
});
['title', 'over'].forEach((id) => $(id).addEventListener('pointerdown', (e) => {
  e.preventDefault(); initAudio(); onJumpPress();
}));

function togglePause() {
  if (state.mode === 'playing') { state.mode = 'paused'; $('paused').classList.remove('hidden'); }
  else if (state.mode === 'paused') { state.mode = 'playing'; $('paused').classList.add('hidden'); }
}

// ------------------------------------------------------------
//  Estado del juego
// ------------------------------------------------------------
let best = 0;
try { best = parseInt(localStorage.getItem('qnmf-best') || '0', 10) || 0; } catch (e) { /* sin storage */ }

let state, player;

function resetState(mode) {
  state = {
    mode, t: 0, speed: 90, dist: 0, leaves: 0, scroll: 0,
    handPos: 26, handY: GROUND - 20, handGrip: 0.1,
    obstacles: [], pickups: [], particles: [],
    swoop: null, swoopTimer: rand(22, 26),
    spawnT: 1.4, pickT: 2.5, dropT: rand(10, 14),
    shake: 0, caught: null, overT: 0, flash: 0,
  };
  player = {
    x: 130, y: GROUND, vy: 0, onGround: true, jumps: 0, duck: false,
    stun: 0, inv: 0, anim: 0, blinkT: 2,
  };
}
resetState('title');

function startGame() {
  resetState('playing');
  $('title').classList.add('hidden');
  $('over').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (isTouch) $('touch').classList.remove('hidden');
}

function playerBox() {
  const h = player.duck ? 12 : 21;
  return { x: player.x + 2, y: player.y - h, w: 8, h };
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ------------------------------------------------------------
//  Partículas
// ------------------------------------------------------------
function puff(x, y, n, colors, opts = {}) {
  for (let i = 0; i < n; i++) {
    state.particles.push({
      x, y,
      vx: rand(-1, 1) * (opts.spread ?? 30) + (opts.vx ?? 0),
      vy: rand(-1, 1) * (opts.spread ?? 30) + (opts.vy ?? 0),
      life: 0, max: rand(0.3, 0.7) * (opts.life ?? 1),
      color: colors[Math.floor(Math.random() * colors.length)],
      size: opts.size ?? 1, grow: opts.grow ?? 0, g: opts.g ?? 0,
    });
  }
}

// ------------------------------------------------------------
//  Spawns
// ------------------------------------------------------------
function spawnObstacle() {
  const r = Math.random();
  if (state.t > 12 && r < 0.25) {
    state.obstacles.push({ type: 'spark', x: W + 10, y: GROUND - 22, w: 8, h: 6, vx: 50 });
  } else if (r < 0.5) {
    state.obstacles.push({ type: 'ashtray', x: W + 10, y: GROUND - 6, w: 16, h: 6, vx: 0, butts: Math.floor(rand(1, 4)) });
  } else {
    state.obstacles.push({ type: 'lighter', x: W + 10, y: GROUND - 12, w: 6, h: 12, vx: 0, spr: LIGHTERS[Math.floor(Math.random() * LIGHTERS.length)] });
    if (state.t > 30 && Math.random() < 0.3) {
      state.obstacles.push({ type: 'lighter', x: W + 18, y: GROUND - 12, w: 6, h: 12, vx: 0, spr: LIGHTERS[Math.floor(Math.random() * LIGHTERS.length)] });
    }
  }
}

function spawnLeaves() {
  const n = Math.floor(rand(3, 6));
  const base = GROUND - rand(14, 40);
  const arc = Math.random() < 0.5;
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? i / (n - 1) : 0;
    state.pickups.push({ type: 'leaf', x: W + 10 + i * 14, y: base - (arc ? Math.sin(k * Math.PI) * 20 : 0), w: 9, h: 9, ph: i });
  }
}

// ------------------------------------------------------------
//  Update
// ------------------------------------------------------------
function update(dt) {
  if (state.mode === 'title') { updateTitle(dt); return; }
  if (state.mode === 'paused') return;
  if (state.mode === 'caught') { updateCaught(dt); updateParticles(dt); return; }
  if (state.mode === 'over') { state.overT += dt; updateCaught(dt); updateParticles(dt); return; }

  const s = state;
  s.t += dt;
  s.speed = Math.min(230, 90 + s.t * 2.2);
  s.scroll += s.speed * dt;
  s.dist += s.speed * dt / 12;
  s.shake = Math.max(0, s.shake - dt * 20);
  s.flash = Math.max(0, s.flash - dt * 3);

  // --- jugador ---
  const p = player;
  p.stun = Math.max(0, p.stun - dt);
  p.inv = Math.max(0, p.inv - dt);
  p.anim += dt * (s.speed / 90);
  p.blinkT -= dt;
  if (p.blinkT < -0.12) p.blinkT = rand(1.5, 4);

  if (p.stun <= 0) {
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    p.x += dir * 115 * dt;
  }
  p.x = clamp(p.x, 0, W - 40);

  if (jumpPressed && p.stun <= 0) {
    if (p.onGround) { p.vy = -265; p.onGround = false; p.jumps = 1; SFX.jump(); puff(p.x + 6, GROUND, 5, ['#8a7fa0', '#5a4f70'], { vy: -10, spread: 20 }); }
    else if (p.jumps < 2) { p.vy = -225; p.jumps = 2; SFX.jump2(); puff(p.x + 6, p.y, 6, ['#f3ecdc', '#cfc3a8'], { vy: 20, spread: 25 }); }
  }
  jumpPressed = false;

  p.duck = keys.down && p.stun <= 0;
  const grav = (p.duck && !p.onGround) ? 1500 : (keys.jump && p.vy < 0 ? 620 : 900);
  p.vy += grav * dt;
  p.y += p.vy * dt;
  if (p.y >= GROUND) { if (!p.onGround) puff(p.x + 6, GROUND, 4, ['#8a7fa0'], { vy: -8, spread: 15 }); p.y = GROUND; p.vy = 0; p.onGround = true; p.jumps = 0; }

  if (p.onGround && Math.random() < dt * 12) {
    s.particles.push({ x: p.x + 3, y: GROUND - 1, vx: -s.speed * 0.4, vy: -rand(5, 15), life: 0, max: 0.3, color: '#5a4f70', size: 1, grow: 0, g: 0 });
  }

  // --- la mano que persigue ---
  const creep = 3 + s.t * 0.07;
  s.handPos += creep * dt;
  s.handPos = Math.max(22, s.handPos);
  const gap = p.x + 2 - s.handPos;
  const targetGrip = gap < 45 ? 0.45 + 0.45 * Math.sin(s.t * 12) : 0.12 + 0.06 * Math.sin(s.t * 3);
  s.handGrip = lerp(s.handGrip, targetGrip, Math.min(1, dt * 10));
  s.handY = lerp(s.handY, clamp(p.y - 11, 50, GROUND - 14), Math.min(1, dt * 2.5));
  if (gap <= 0) { catchPlayer('hand'); return; }

  // --- obstáculos ---
  s.spawnT -= dt;
  if (s.spawnT <= 0) { spawnObstacle(); s.spawnT = rand(0.9, 1.9) * Math.sqrt(110 / s.speed); }
  const pb = playerBox();
  for (const o of s.obstacles) {
    o.x -= (s.speed + o.vx) * dt;
    if (o.type === 'spark' && Math.random() < dt * 30) puff(o.x + 8, o.y + 3, 1, ['#ffd23f', '#ff8a2a', '#e2352f'], { vx: 40, spread: 10, life: 0.6 });
    if (!o.hit && p.inv <= 0 && overlap(pb, o)) {
      o.hit = true;
      s.handPos += 26;
      p.x -= 14;
      p.stun = 0.25;
      p.inv = 1.2;
      s.shake = 4;
      s.flash = 1;
      SFX.hit();
      puff(p.x + 6, p.y - 10, 10, ['#ffd23f', '#ff8a2a', '#f3ecdc'], { spread: 50 });
    }
  }
  s.obstacles = s.obstacles.filter(o => o.x > -30);

  // --- pickups ---
  s.pickT -= dt;
  if (s.pickT <= 0) { spawnLeaves(); s.pickT = rand(2.5, 4.5); }
  s.dropT -= dt;
  if (s.dropT <= 0) {
    s.pickups.push({ type: 'drop', x: W + 10, y: GROUND - rand(30, 48), w: 7, h: 9, ph: 0 });
    s.dropT = rand(11, 16);
  }
  for (const k of s.pickups) {
    k.x -= s.speed * dt;
    k.ph += dt;
    if (!k.got && overlap(pb, { x: k.x, y: k.y + Math.round(Math.sin(k.ph * 5) * 1.5), w: k.w, h: k.h })) {
      k.got = true;
      if (k.type === 'leaf') {
        s.leaves++; s.handPos -= 6; SFX.leaf();
        puff(k.x + 4, k.y + 4, 6, ['#8fdc6a', '#6dbb4f', '#f3ecdc'], { spread: 35 });
      } else {
        s.handPos -= 40; SFX.drop();
        puff(k.x + 3, k.y + 4, 14, ['#4fb3ff', '#2b6fd1', '#ffffff'], { spread: 60 });
      }
    }
  }
  s.pickups = s.pickups.filter(k => !k.got && k.x > -20);

  // --- ataque desde arriba ---
  s.swoopTimer -= dt;
  if (!s.swoop && s.swoopTimer <= 0) {
    s.swoop = { phase: 'warn', t: 0, x: Math.round(p.x + 6), warn: Math.max(0.6, 1.15 - s.t * 0.003), beepT: 0 };
    s.swoopTimer = rand(6, 10);
  }
  if (s.swoop) {
    const sw = s.swoop;
    sw.t += dt;
    if (sw.phase === 'warn') {
      sw.beepT -= dt;
      if (sw.beepT <= 0) { SFX.warn(); sw.beepT = 0.18; }
      if (sw.t >= sw.warn) { sw.phase = 'drop'; sw.t = 0; SFX.swoop(); }
    } else if (sw.phase === 'drop') {
      if (sw.t >= 0.15) { sw.phase = 'hold'; sw.t = 0; s.shake = 3; puff(sw.x, GROUND, 10, ['#8a7fa0', '#5a4f70'], { vy: -15, spread: 40 }); }
    } else if (sw.phase === 'hold') {
      if (sw.t >= 0.35) { sw.phase = 'rise'; sw.t = 0; }
    } else if (sw.phase === 'rise') {
      if (sw.t >= 0.5) s.swoop = null;
    }
    if (s.swoop && (sw.phase === 'hold' || (sw.phase === 'drop' && sw.t > 0.08))) {
      if (overlap(pb, { x: sw.x - 16, y: 0, w: 32, h: GROUND })) { catchPlayer('swoop'); return; }
    }
  }

  updateParticles(dt);
  updateHud();
}

function updateParticles(dt) {
  for (const q of state.particles) {
    q.life += dt;
    q.vy += q.g * dt;
    q.x += q.vx * dt; q.y += q.vy * dt;
    q.size += q.grow * dt;
  }
  state.particles = state.particles.filter(q => q.life < q.max);
}

function updateTitle(dt) {
  state.t += dt;
  state.scroll += 60 * dt;
  player.anim += dt;
  player.blinkT -= dt;
  if (player.blinkT < -0.12) player.blinkT = rand(1.5, 4);
  player.x = 150 + Math.sin(state.t * 0.8) * 20;
  state.handPos = player.x - 40 + Math.sin(state.t * 1.3) * 12;
  state.handGrip = 0.3 + 0.3 * Math.sin(state.t * 6);
  state.handY = GROUND - 14;
}

function catchPlayer(by) {
  state.mode = 'caught';
  state.caught = { by, t: 0, smokeT: 0, flicked: false, inhaled: false };
  state.shake = 5;
  SFX.caught();
  $('hud').classList.add('hidden');
  $('touch').classList.add('hidden');
}

function updateCaught(dt) {
  const c = state.caught;
  c.t += dt;
  state.shake = Math.max(0, state.shake - dt * 10);
  if (c.t > 1.55 && !c.flicked) { c.flicked = true; SFX.flick(); }
  if (c.t > 1.8 && !c.inhaled) { c.inhaled = true; SFX.inhale(); }
  if (c.t > 1.8) {
    c.smokeT -= dt;
    if (c.smokeT <= 0) {
      c.smokeT = 0.06;
      const tip = tableauToScreen(4, -30);
      state.particles.push({
        x: tip.x + rand(-1, 1), y: tip.y, vx: rand(-6, 6) + Math.sin(c.t * 2) * 6, vy: -rand(14, 24),
        life: 0, max: rand(1.6, 2.6), color: Math.random() < 0.5 ? '#b8b0c8' : '#8a80a0', size: 2, grow: 3.5, g: 0,
      });
    }
  }
  if (state.mode === 'caught' && c.t > 2.9) gameOver();
}

function gameOver() {
  state.mode = 'over';
  state.overT = 0;
  const m = Math.floor(state.dist);
  const isBest = m > best;
  if (isBest) { best = m; try { localStorage.setItem('qnmf-best', String(best)); } catch (e) { /* nada */ } }
  $('final').textContent = `${m} m · ${state.leaves} hojas`;
  $('newBest').classList.toggle('hidden', !isBest);
  $('bestOver').textContent = best;
  $('bestTitle').textContent = best;
  $('over').classList.remove('hidden');
}

function updateHud() {
  $('score').textContent = `${Math.floor(state.dist)} m`;
  $('leaves').textContent = `HOJAS ${state.leaves}`;
  const danger = clamp(1 - (player.x + 2 - state.handPos) / 150, 0, 1);
  const fill = $('fill');
  fill.style.width = `${Math.round(danger * 100)}%`;
  fill.style.background = danger > 0.7 ? '#ff6b4a' : danger > 0.4 ? '#ffd23f' : '#8fdc6a';
}

// ------------------------------------------------------------
//  Render
// ------------------------------------------------------------
function drawBackground() {
  ctx.drawImage(SKY, 0, 0);
  // estrellas que parpadean
  for (let i = 0; i < 8; i++) {
    if (Math.sin(state.t * 3 + i * 1.7) > 0.6) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((i * 41 + 13) % W, (i * 23 + 7) % 80, 1, 1);
    }
  }
  const layer = (img, factor, y) => {
    const off = Math.floor((state.scroll * factor) % img.width);
    ctx.drawImage(img, -off, y);
    ctx.drawImage(img, img.width - off, y);
  };
  layer(FAR, 0.15, GROUND - 90);
  layer(NEAR, 0.4, GROUND - 70);

  // banqueta
  ctx.fillStyle = '#3a2f4a'; ctx.fillRect(0, GROUND, W, 4);
  ctx.fillStyle = '#5a4f70'; ctx.fillRect(0, GROUND, W, 1);
  ctx.fillStyle = '#2a2236'; ctx.fillRect(0, GROUND + 4, W, H - GROUND - 4);
  const off = Math.floor(state.scroll % 24);
  ctx.fillStyle = '#1b1424';
  for (let x = -off; x < W; x += 24) ctx.fillRect(x, GROUND + 1, 1, 3);
  ctx.fillStyle = '#221b2e';
  for (let x = -Math.floor(state.scroll * 1.2 % 40); x < W; x += 40) ctx.fillRect(x, GROUND + 14, 20, 2);
}

function drawPlayer() {
  const p = player;
  if (p.inv > 0 && Math.floor(p.inv * 20) % 2 === 0 && state.mode === 'playing') return;
  const x = Math.round(p.x), y = Math.round(p.y);
  const near = state.mode === 'playing' && (p.x - state.handPos) < 50;
  const spr = near || p.stun > 0 ? SPR.scared : (p.blinkT < 0 ? SPR.blink : SPR.porro);
  const f = Math.floor(p.anim * 10) % 2;

  ctx.fillStyle = OUT;
  if (p.duck) {
    ctx.drawImage(spr, x, y - 12, 12, 12);
    return;
  }
  // piernas
  if (p.onGround) {
    ctx.fillRect(x + 4 + (f ? -1 : 1), y - 3, 1, 3); ctx.fillRect(x + 3 + (f ? -1 : 1), y - 1, 2, 1);
    ctx.fillRect(x + 7 + (f ? 1 : -1), y - 3, 1, 3); ctx.fillRect(x + 7 + (f ? 1 : -1), y - 1, 2, 1);
  } else {
    ctx.fillRect(x + 3, y - 3, 1, 2); ctx.fillRect(x + 8, y - 3, 1, 2);
  }
  ctx.drawImage(spr, x, y - 22);
  // bracitos
  const panic = near ? (Math.floor(state.t * 16) % 2) : f;
  if (near) {
    ctx.fillRect(x + 1, y - 15 - panic * 2, 1, 4);
    ctx.fillRect(x + 10, y - 13 - (1 - panic) * 2, 1, 4);
  } else {
    ctx.fillRect(x + 1, y - 12 + panic, 1, 3);
    ctx.fillRect(x + 10, y - 11 - panic, 1, 3);
  }
  // gotitas de sudor
  if (near && Math.floor(state.t * 4) % 2 === 0) {
    ctx.fillStyle = '#4fb3ff';
    ctx.fillRect(x + 10, y - 20, 1, 2);
  }
}

function drawObstacles() {
  for (const o of state.obstacles) {
    const x = Math.round(o.x), y = Math.round(o.y);
    if (o.type === 'lighter') {
      ctx.drawImage(o.spr, x, y);
      const fl = Math.floor(state.t * 12 + x) % 3;
      ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x + 2, y - 3 - (fl === 0 ? 1 : 0), 2, 3 + (fl === 0 ? 1 : 0));
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 2 + (fl === 2 ? 1 : 0), y - 2, 1, 2);
    } else if (o.type === 'ashtray') {
      for (let i = 0; i < o.butts; i++) {
        const bx = x + 3 + i * 4;
        ctx.fillStyle = OUT; ctx.fillRect(bx - 1, y - 5 + (i % 2), 3, 5);
        ctx.fillStyle = '#d9a45b'; ctx.fillRect(bx, y - 4 + (i % 2), 1, 2);
        ctx.fillStyle = '#6d7389'; ctx.fillRect(bx, y - 5 + (i % 2), 1, 1);
      }
      ctx.drawImage(SPR.ashtray, x, y);
    } else if (o.type === 'spark') {
      const fl = Math.floor(state.t * 20) % 2;
      ctx.fillStyle = '#e2352f'; ctx.fillRect(x, y, 8, 6);
      ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x + 1, y + 1, 6, 4);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 1 + fl, y + 2, 3, 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1 + fl, y + 2, 1, 1);
    }
  }
}

function drawPickups() {
  for (const k of state.pickups) {
    const y = Math.round(k.y + Math.sin(k.ph * 5) * 1.5);
    ctx.drawImage(k.type === 'leaf' ? SPR.leaf : SPR.drop, Math.round(k.x), y);
    if (k.type === 'drop' && Math.floor(state.t * 6) % 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(k.x) + 8, y, 1, 1); }
  }
}

function drawParticles() {
  for (const q of state.particles) {
    const a = 1 - q.life / q.max;
    ctx.globalAlpha = clamp(a * 1.2, 0, 1);
    ctx.fillStyle = q.color;
    const s = Math.max(1, Math.round(q.size));
    ctx.fillRect(Math.round(q.x - s / 2), Math.round(q.y - s / 2), s, s);
  }
  ctx.globalAlpha = 1;
}

function drawChaseHand() {
  const reach = handReach(state.handGrip);
  drawHand(state.handPos - reach, state.handY, state.handGrip);
}

function drawSwoop() {
  const sw = state.swoop;
  if (!sw) return;
  // sombra
  let shadowW = 0;
  if (sw.phase === 'warn') shadowW = Math.round(8 + 24 * (sw.t / sw.warn));
  else if (sw.phase !== 'rise') shadowW = 32;
  if (shadowW) {
    ctx.fillStyle = 'rgba(10,5,20,0.6)';
    ctx.fillRect(sw.x - shadowW / 2, GROUND - 1, shadowW, 3);
    ctx.fillRect(sw.x - shadowW / 2 + 2, GROUND - 2, shadowW - 4, 1);
    if (sw.phase === 'warn' && Math.floor(sw.t * 8) % 2 === 0) {
      ctx.fillStyle = '#ff6b4a';
      ctx.fillRect(sw.x - 1, GROUND - 30, 2, 7);
      ctx.fillRect(sw.x - 1, GROUND - 21, 2, 2);
    }
  }
  // mano bajando
  const tipGround = GROUND - 1;
  let tipY;
  if (sw.phase === 'warn') tipY = 8 + Math.sin(sw.t * 30) * 2;
  else if (sw.phase === 'drop') tipY = lerp(0, tipGround, sw.t / 0.15);
  else if (sw.phase === 'hold') tipY = tipGround;
  else tipY = lerp(tipGround, -20, sw.t / 0.5);
  const grip = sw.phase === 'hold' ? Math.min(1, sw.t * 4) : sw.phase === 'rise' ? 1 : 0.1;
  drawHand(sw.x - 4, tipY - handReach(grip), grip, Math.PI / 2);
}

// Escena final: la mano sostiene al porro y lo prende
const TAB = { x: W / 2 - 8, y: H / 2 + 34, s: 2 };
function tableauToScreen(lx, ly) { return { x: TAB.x + lx * TAB.s, y: TAB.y + ly * TAB.s }; }

function drawCaught() {
  const c = state.caught;
  if (c.t < 0.7) {
    // la mano aprieta en el lugar
    const p = player;
    const k = c.t / 0.7;
    const sx = Math.round(p.x + Math.sin(c.t * 60) * 1);
    ctx.drawImage(SPR.scared, sx, Math.round(p.y) - 22);
    if (c.by === 'hand') {
      const g = lerp(state.handGrip, 1, k);
      drawHand(p.x + 10 - handReach(g), p.y - 11, g);
    } else {
      const g = lerp(0.3, 1, k);
      drawHand(state.swoop.x - 4, GROUND - 1 - handReach(g), g, Math.PI / 2);
    }
    return;
  }
  // fundido
  const fade = clamp((c.t - 0.7) / 0.25, 0, 1);
  ctx.fillStyle = `rgba(13,10,20,${0.82 * fade})`;
  ctx.fillRect(0, 0, W, H);
  if (c.t < 0.9) return;

  ctx.save();
  ctx.translate(TAB.x, TAB.y);
  ctx.scale(TAB.s, TAB.s);
  const lit = c.t > 1.7;
  const spr = c.t > 2.2 ? SPR.stoned : SPR.scared;
  const shake = c.t < 1.7 ? Math.round(Math.sin(c.t * 50) * 0.6) : 0;
  ctx.drawImage(spr, -2 + shake, -30);
  if (lit) {
    const fl = Math.floor(c.t * 8) % 2;
    ctx.fillStyle = '#e2352f'; ctx.fillRect(3, -30, 2, 2);
    ctx.fillStyle = fl ? '#ffd23f' : '#ff8a2a'; ctx.fillRect(3 + fl, -30, 1, 1);
    ctx.fillStyle = '#4a4458'; ctx.fillRect(3, -28, 2, 1);
  }
  // mano (a escala 2x, encima del porro para que lo "agarre")
  drawHand(0, 0, 1);
  // encendedor
  if (c.t > 1.0 && c.t < 2.4) {
    const inK = clamp((c.t - 1.0) / 0.5, 0, 1), outK = clamp((c.t - 2.0) / 0.4, 0, 1);
    const lx = Math.round(lerp(60, 9, inK) + outK * 60);
    ctx.drawImage(LIGHTERS[0], lx, -26);
    if (c.t > 1.55) {
      const fl = Math.floor(c.t * 14) % 2;
      ctx.fillStyle = '#ff8a2a'; ctx.fillRect(lx - 3 - fl, -31, 5, 4);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(lx - 2 - fl, -30, 2, 3);
    }
  }
  ctx.restore();
}

function render() {
  ctx.save();
  if (state.shake > 0) ctx.translate(Math.round(rand(-1, 1) * state.shake), Math.round(rand(-1, 1) * state.shake));
  drawBackground();
  drawPickups();
  drawObstacles();
  if (state.mode === 'caught' || state.mode === 'over') {
    drawCaught();
  } else {
    drawPlayer();
    drawChaseHand();
    drawSwoop();
  }
  drawParticles();
  ctx.restore();
  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,107,74,${state.flash * 0.25})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ------------------------------------------------------------
//  Escalado de pantalla
// ------------------------------------------------------------
function resize() {
  const fit = Math.min(innerWidth / W, innerHeight / H);
  const s = fit >= 2 ? Math.floor(fit) : fit;
  const wrap = $('wrap');
  wrap.style.width = `${W * s}px`;
  wrap.style.height = `${H * s}px`;
  wrap.style.setProperty('--s', s);
}
addEventListener('resize', resize);
resize();
$('bestTitle').textContent = best;

// ------------------------------------------------------------
//  Loop
// ------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
