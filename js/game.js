'use strict';

// ============================================================
//  QUE NO ME FUMEN — lógica principal
// ============================================================

let state, player;
const keys = { left: false, right: false, down: false, jump: false, smoke: false };
let jumpBuf = 0, smokePressed = false;

function baseState(mode) {
  return {
    mode, t: 0, dist: 0, speed: 95, scroll: 0,
    zone: 0, prevZone: 0, zoneFade: 0,
    leaves: 0, score: 0, combo: 0,
    handPos: 24, handY: GROUND - 12, handGrip: 0.1, handStun: 0,
    obstacles: [], pickups: [], particles: [],
    swoop: null, swoopTimer: 28,
    spawnT: 1.4, pickT: 2.5, dropT: rand(10, 14), powT: rand(8, 12),
    shake: 0, flash: 0, caught: null, overT: 0,
    smoke: 0, shields: 0, power: { magnet: 0, turbo: 0, x2: 0 },
    revived: false, lastHitDist: 0,
    run: { leaves: 0, dist: 0, noHit: 0, zone: 1 },
    doneThisRun: [], newBest: false,
  };
}

function newPlayer() {
  return {
    x: 110, y: GROUND, prevY: GROUND, vy: 0, onGround: true, coyote: 0, jumps: 0,
    duck: false, stun: 0, inv: 0, anim: 0, blinkT: 2, angryT: 0,
  };
}

function toMenu() {
  if (state && state.mode !== 'menu') persist();
  state = baseState('menu');
  player = newPlayer();
  state.handPos = 60;
  UI.setHud(false);
  UI.menu();
}

function startRun() {
  initAudio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  state = baseState('playing');
  player = newPlayer();
  state.shields = upg('shield');
  for (const k in keys) keys[k] = false;
  missionsRunStart();
  SAVE.stats.runs = (SAVE.stats.runs || 0) + 1;
  trackTotal('runs', 1);
  UI.hideScreens();
  UI.setHud(true);
  UI.banner(`ZONA 1 · ${zoneName(0)}`, '¡Corre, que te fuman!');
}

function togglePause() {
  if (state.mode === 'playing') { state.mode = 'paused'; UI.show('paused'); persist(); }
  else if (state.mode === 'paused') { state.mode = 'playing'; UI.hideScreens(); }
}

// ------------------------------------------------------------
//  Entrada
// ------------------------------------------------------------
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowDown: 'down', KeyS: 'down', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  KeyE: 'smoke', KeyX: 'smoke', KeyK: 'smoke', ShiftLeft: 'smoke', ShiftRight: 'smoke',
};

function pressKey(k) {
  if (keys[k]) return;
  keys[k] = true;
  if (k === 'jump') jumpBuf = 0.12;
  if (k === 'smoke') smokePressed = true;
}

addEventListener('keydown', (e) => {
  initAudio();
  const k = KEYMAP[e.code];
  if (state.mode === 'playing' && k) { e.preventDefault(); pressKey(k); return; }
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (state.mode === 'playing' || state.mode === 'paused') { e.preventDefault(); togglePause(); return; }
    if (UI.current === 'shop' || UI.current === 'missions') { UI.back(); return; }
  }
  if (e.code === 'KeyM') { UI.toggleMute(); return; }
  const onButton = document.activeElement && document.activeElement.tagName === 'BUTTON';
  if ((e.code === 'Space' || e.code === 'Enter') && !onButton) {
    if (UI.current === 'menu' || (UI.current === 'over' && state.overT > 0.6)) { e.preventDefault(); startRun(); }
  }
});
addEventListener('keyup', (e) => {
  const k = KEYMAP[e.code];
  if (k) keys[k] = false;
});

// ------------------------------------------------------------
//  Utilidades
// ------------------------------------------------------------
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function playerBox() {
  const p = player;
  return p.duck ? { x: p.x + 3, y: p.y - 8, w: 20, h: 8 } : { x: p.x + 4, y: p.y - 12, w: 19, h: 12 };
}

function puff(x, y, n, colors, o = {}) {
  for (let i = 0; i < n; i++) {
    state.particles.push({
      x, y,
      vx: rand(-1, 1) * (o.spread ?? 30) + (o.vx ?? 0),
      vy: rand(-1, 1) * (o.spread ?? 30) + (o.vy ?? 0),
      life: 0, max: rand(0.3, 0.7) * (o.life ?? 1),
      color: pick(colors), size: o.size ?? 1, grow: o.grow ?? 0, g: o.g ?? 0,
    });
  }
}

function addScore(n) { state.score += n * rankMult(); }
const comboMult = () => 1 + Math.min(4, Math.floor(state.combo / 10));
const powDur = (k) => POWERUPS[k].dur * (1 + 0.2 * upg('power'));

// ------------------------------------------------------------
//  Spawns
// ------------------------------------------------------------
function spawnObstacle() {
  const s = state, type = pick(zoneData(s.zone).obs);
  const x = W + 10;
  switch (type) {
    case 'lighter':
      s.obstacles.push({ type, x, y: GROUND - 12, w: 6, h: 12, vx: 0, spr: pick(LIGHTERS), stomp: true });
      if (s.zone >= 1 && Math.random() < 0.25) s.obstacles.push({ type, x: x + 8, y: GROUND - 12, w: 6, h: 12, vx: 0, spr: pick(LIGHTERS), stomp: true });
      break;
    case 'ashtray':
      s.obstacles.push({ type, x, y: GROUND - 6, w: 16, h: 6, vx: 0, butts: Math.floor(rand(1, 4)), stomp: true });
      break;
    case 'cup':
      s.obstacles.push({ type, x, y: GROUND - 10, w: 9, h: 10, vx: 0, stomp: true });
      break;
    case 'spark':
      s.obstacles.push({ type, x, y: GROUND - 15, w: 8, h: 5, vx: 50 + s.zone * 8 });
      break;
    case 'match': {
      const mx = clamp(player.x + rand(0, 90), 40, W - 20);
      s.obstacles.push({ type, x: mx, y: -18, w: 4, h: 14, vx: 0, phase: 'warn', t: 0, warn: Math.max(0.55, 0.9 - s.zone * 0.05) });
      break;
    }
    case 'torch':
      s.obstacles.push({ type, x, y: GROUND - 10, w: 7, h: 10, vx: 0, ph: rand(0, 1), stomp: true });
      break;
  }
}

function spawnLeaves() {
  const n = Math.floor(rand(3, 7));
  const base = GROUND - rand(14, 44);
  const arc = Math.random() < 0.5;
  for (let i = 0; i < n; i++) {
    const k = n > 1 ? i / (n - 1) : 0;
    state.pickups.push({ type: 'leaf', x: W + 10 + i * 14, y: base - (arc ? Math.sin(k * Math.PI) * 20 : 0), w: 9, h: 9, ph: i });
  }
}

function spawnPower() {
  const kinds = ['shield', 'magnet', 'turbo', 'x2'];
  state.pickups.push({ type: 'pow', kind: pick(kinds), x: W + 10, y: GROUND - rand(26, 50), w: 13, h: 13, ph: 0 });
}

// ------------------------------------------------------------
//  Acciones
// ------------------------------------------------------------
function useSmoke() {
  const s = state, p = player;
  s.smoke = 0;
  const lvl = upg('smoke');
  s.handPos -= 55 + 12 * lvl;
  s.handStun = 2 + 0.3 * lvl;
  if (s.swoop && s.swoop.phase !== 'rise') { s.swoop.phase = 'rise'; s.swoop.t = 0; s.swoop.repelled = true; }
  for (let i = 0; i < 40; i++) {
    s.particles.push({
      x: p.x + 2, y: p.y - 6 + rand(-3, 3), vx: -rand(120, 260), vy: rand(-30, 30),
      life: 0, max: rand(0.5, 1.0), color: pick(['#d8d0e8', '#b8b0c8', '#8a80a0']), size: rand(2, 4), grow: 8, g: -20,
    });
  }
  p.angryT = 0.7;
  s.shake = 2;
  SFX.smoke();
  setTimeout(() => SFX.cough(), 250);
  addScore(30);
  trackTotal('smokes', 1);
}

function hitPlayer(o) {
  const s = state, p = player;
  if (s.power.turbo > 0) { smash(o); return; }
  if (p.inv > 0) return;
  o.hit = true;
  if (s.shields > 0) {
    s.shields--;
    p.inv = 1.2;
    o.dead = true;
    SFX.shield();
    puff(p.x + 13, p.y - 8, 16, ['#7fd6ff', '#ffffff'], { spread: 60 });
    return;
  }
  s.handPos += 26;
  p.x -= 14;
  p.stun = 0.25;
  p.inv = 1.2;
  s.combo = 0;
  s.lastHitDist = s.dist;
  s.shake = 4;
  s.flash = 1;
  SFX.hit();
  puff(p.x + 13, p.y - 8, 10, ['#ffd23f', '#ff8a2a', '#f3ecdc'], { spread: 50 });
}

function smash(o) {
  o.dead = true;
  addScore(25);
  puff(o.x + o.w / 2, o.y + o.h / 2, 12, ['#ffd23f', '#ff8a2a', '#b8bed0', '#ffffff'], { spread: 70 });
  SFX.stomp();
}

function stomp(o) {
  const p = player;
  smash(o);
  p.vy = -230;
  p.jumps = 1;
  state.shake = 2;
  trackTotal('stomps', 1);
}

// Cuando la mano te alcanza (de lado o desde arriba)
function handReached(by) {
  const s = state, p = player;
  if (s.shields > 0) {
    s.shields--;
    s.handPos -= 50;
    s.handStun = 1.2;
    p.inv = 1.5;
    if (s.swoop) { s.swoop.phase = 'rise'; s.swoop.t = 0; s.swoop.repelled = true; }
    SFX.shield();
    puff(p.x + 13, p.y - 8, 20, ['#7fd6ff', '#ffffff'], { spread: 70 });
    return;
  }
  catchPlayer(by);
}

function catchPlayer(by) {
  state.mode = 'caught';
  state.caught = { by, t: 0, smokeT: 0, flicked: false, inhaled: false };
  state.shake = 5;
  SFX.caught();
  UI.setHud(false);
}

function revive() {
  const cost = reviveCost();
  if (state.revived || SAVE.wallet < cost) { SFX.nope(); return; }
  SAVE.wallet -= cost;
  persist();
  const s = state, p = player;
  s.revived = true;
  s.mode = 'playing';
  s.caught = null;
  s.swoop = null;
  s.swoopTimer = 6;
  s.handPos = 20;
  s.handStun = 2.5;
  s.obstacles = s.obstacles.filter(o => o.x > p.x + 90 && o.type !== 'match');
  p.x = Math.max(p.x, 120); p.y = GROUND; p.vy = 0; p.inv = 2.5; p.stun = 0;
  UI.hideScreens();
  UI.setHud(true);
  SFX.power();
  UI.toast('¡REVIVISTE!', 'La mano se quemó los dedos', 'leaf');
}
const reviveCost = () => 40 + 20 * state.zone;

// ------------------------------------------------------------
//  Update
// ------------------------------------------------------------
function update(dt) {
  switch (state.mode) {
    case 'menu': updateMenu(dt); break;
    case 'playing': updatePlay(dt); break;
    case 'caught': updateCaught(dt); break;
    case 'over': state.overT += dt; updateCaught(dt); break;
    default: return;
  }
  updateParticles(dt);
}

function updateMenu(dt) {
  const s = state, p = player;
  s.t += dt;
  s.scroll += 60 * dt;
  p.anim += dt;
  p.blinkT -= dt;
  if (p.blinkT < -0.12) p.blinkT = rand(1.5, 4);
  p.x = 170 + Math.sin(s.t * 0.8) * 25;
  s.handPos = p.x - 45 + Math.sin(s.t * 1.3) * 12;
  s.handGrip = 0.3 + 0.3 * Math.sin(s.t * 6);
  s.handY = GROUND - 12;
}

function updatePlay(dt) {
  const s = state, p = player;
  s.t += dt;
  const turbo = s.power.turbo > 0;
  s.speed = Math.min(270, 95 + s.dist * 0.06) * (turbo ? 1.35 : 1);
  s.scroll += s.speed * dt;
  const dm = (s.speed * dt) / 12;
  s.dist += dm;
  addScore(dm);
  s.shake = Math.max(0, s.shake - dt * 20);
  s.flash = Math.max(0, s.flash - dt * 3);
  s.zoneFade = Math.max(0, s.zoneFade - dt * 0.6);
  for (const k in s.power) s.power[k] = Math.max(0, s.power[k] - dt);

  // --- zonas ---
  const z = Math.floor(s.dist / ZONE_LEN);
  if (z > s.zone) {
    s.prevZone = s.zone; s.zone = z; s.zoneFade = 1;
    const bonus = 15 * z;
    SAVE.wallet += bonus;
    SAVE.maxZone = Math.max(SAVE.maxZone, z);
    addScore(200);
    SFX.zone();
    UI.banner(`ZONA ${z + 1} · ${zoneName(z)}`, `+${bonus} hojas`);
    trackRun('zone', z + 1);
  }
  trackRun('dist', s.dist);
  trackRun('noHit', s.dist - s.lastHitDist);

  // --- jugador ---
  p.stun = Math.max(0, p.stun - dt);
  p.inv = Math.max(0, p.inv - dt);
  p.angryT = Math.max(0, p.angryT - dt);
  p.anim += dt * (s.speed / 90);
  p.blinkT -= dt;
  if (p.blinkT < -0.12) p.blinkT = rand(1.5, 4);

  if (p.stun <= 0) {
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    p.x += dir * (110 + 15 * upg('legs')) * dt;
  }
  p.x = clamp(p.x, 0, W - 60);

  jumpBuf = Math.max(0, jumpBuf - dt);
  p.coyote = p.onGround ? 0.08 : Math.max(0, p.coyote - dt);
  const maxJumps = 2 + upg('jump');
  if (jumpBuf > 0 && p.stun <= 0) {
    if (p.onGround || p.coyote > 0) {
      p.vy = -265; p.onGround = false; p.coyote = 0; p.jumps = 1; jumpBuf = 0;
      SFX.jump();
      puff(p.x + 12, GROUND, 5, ['#8a7fa0', '#5a4f70'], { vy: -10, spread: 20 });
    } else if (p.jumps < maxJumps) {
      p.vy = -225; p.jumps++; jumpBuf = 0;
      SFX.jump2();
      puff(p.x + 12, p.y, 6, ['#f3ecdc', '#cfc3a8'], { vy: 20, spread: 25 });
    }
  }
  if (smokePressed && s.smoke >= 100) useSmoke();
  smokePressed = false;

  p.duck = keys.down && p.stun <= 0;
  const grav = (p.duck && !p.onGround) ? 1500 : (keys.jump && p.vy < 0 ? 620 : 900);
  p.prevY = p.y;
  p.vy += grav * dt;
  p.y += p.vy * dt;
  if (p.y >= GROUND) {
    if (!p.onGround) puff(p.x + 12, GROUND, 4, ['#8a7fa0'], { vy: -8, spread: 15 });
    p.y = GROUND; p.vy = 0; p.onGround = true; p.jumps = 0;
  } else {
    p.onGround = false;
  }
  if (p.onGround && Math.random() < dt * 12) {
    s.particles.push({ x: p.x + 4, y: GROUND - 1, vx: -s.speed * 0.4, vy: -rand(5, 15), life: 0, max: 0.3, color: '#5a4f70', size: 1, grow: 0, g: 0 });
  }
  if (turbo && Math.random() < dt * 40) {
    s.particles.push({ x: p.x, y: p.y - rand(2, 10), vx: -s.speed, vy: 0, life: 0, max: 0.35, color: pick(['#e2352f', '#ffd23f', '#3fbf5a', '#2f8de2', '#8a4fd8']), size: 2, grow: 0, g: 0 });
  }

  // --- humo: se carga solo y con hojas ---
  s.smoke = Math.min(100, s.smoke + (2 + 0.6 * upg('smoke')) * dt);

  // --- la mano que persigue ---
  s.handStun = Math.max(0, s.handStun - dt);
  if (s.handStun <= 0) s.handPos += (3.2 + s.zone * 1.4 + Math.min(s.t, 60) * 0.02) * dt;
  if (turbo) s.handPos -= 25 * dt;
  s.handPos = Math.max(20, s.handPos);
  const gap = p.x + 2 - s.handPos;
  const targetGrip = s.handStun > 0 ? 0 : gap < 45 ? 0.45 + 0.45 * Math.sin(s.t * 12) : 0.12 + 0.06 * Math.sin(s.t * 3);
  s.handGrip = lerp(s.handGrip, targetGrip, Math.min(1, dt * 10));
  s.handY = lerp(s.handY, clamp(p.y - 7, 50, GROUND - 12), Math.min(1, dt * 2.5));
  if (s.handStun > 0 && Math.random() < dt * 8) {
    puff(s.handPos - 10, s.handY - 4, 1, ['#b8b0c8', '#8a80a0'], { vy: -20, spread: 10, size: 2, grow: 4, life: 1.5 });
  }
  if (gap <= 0 && p.inv <= 0) { handReached('hand'); if (state.mode !== 'playing') return; }
  else if (gap <= 0) p.x = s.handPos - 1;

  // --- obstáculos ---
  s.spawnT -= dt;
  if (s.spawnT <= 0) {
    spawnObstacle();
    s.spawnT = rand(0.85, 1.8) * Math.sqrt(110 / s.speed) * (1 - Math.min(0.25, s.zone * 0.05));
  }
  const pb = playerBox();
  for (const o of s.obstacles) {
    if (o.type === 'match') { updateMatch(o, dt); }
    else {
      o.x -= (s.speed + o.vx) * dt;
      if (o.type === 'spark' && Math.random() < dt * 30) puff(o.x + 8, o.y + 2, 1, ['#ffd23f', '#ff8a2a', '#e2352f'], { vx: 40, spread: 10, life: 0.6 });
      if (o.type === 'torch') o.ph += dt;
    }
    if (o.dead || o.hit) continue;
    const flame = torchFlame(o);
    if (flame && overlap(pb, flame)) { hitPlayer(o); continue; }
    if (o.type === 'match' && o.phase === 'warn') continue;
    if (overlap(pb, o)) {
      if (o.stomp && !flame && p.vy > 0 && p.prevY <= o.y + 4) stomp(o);
      else hitPlayer(o);
    }
  }
  s.obstacles = s.obstacles.filter(o => !o.dead && o.x > -30);

  // --- pickups ---
  s.pickT -= dt;
  if (s.pickT <= 0) { spawnLeaves(); s.pickT = rand(2.2, 4.2); }
  s.dropT -= dt;
  if (s.dropT <= 0) { s.pickups.push({ type: 'drop', x: W + 10, y: GROUND - rand(30, 48), w: 7, h: 9, ph: 0 }); s.dropT = rand(11, 16); }
  s.powT -= dt;
  if (s.powT <= 0) { spawnPower(); s.powT = rand(12, 18) * (1 - 0.12 * upg('luck')); }

  const magnetR = 10 * upg('magnet') + (s.power.magnet > 0 ? 80 : 0);
  const pcx = p.x + 13, pcy = p.y - 6;
  for (const k of s.pickups) {
    k.x -= s.speed * dt;
    k.ph += dt;
    if (magnetR > 0 && k.type === 'leaf') {
      const dx = pcx - (k.x + 4), dy = pcy - (k.y + 4), d = Math.hypot(dx, dy);
      if (d < magnetR) { k.x += dx * Math.min(1, dt * 8); k.y += dy * Math.min(1, dt * 8); }
    }
    if (!k.got && overlap(pb, { x: k.x, y: k.y + Math.round(Math.sin(k.ph * 5) * 1.5), w: k.w, h: k.h })) collect(k);
  }
  s.pickups = s.pickups.filter(k => !k.got && k.x > -20);

  updateSwoop(dt, pb);
  if (s.mode === 'playing') UI.hud();
}

function collect(k) {
  const s = state;
  k.got = true;
  if (k.type === 'leaf') {
    const n = s.power.x2 > 0 ? 2 : 1;
    s.leaves += n;
    SAVE.wallet += n;
    s.combo++;
    addScore(5 * comboMult() * n);
    s.smoke = Math.min(100, s.smoke + 3 + 0.5 * upg('smoke'));
    s.handPos -= 5;
    SFX.leaf();
    puff(k.x + 4, k.y + 4, 6, ['#8fdc6a', '#6dbb4f', '#f3ecdc'], { spread: 35 });
    trackRun('leaves', s.leaves);
  } else if (k.type === 'drop') {
    s.handPos -= 40 + 12 * upg('water');
    s.handStun = Math.max(s.handStun, 0.8);
    addScore(20);
    SFX.drop();
    puff(k.x + 3, k.y + 4, 14, ['#4fb3ff', '#2b6fd1', '#ffffff'], { spread: 60 });
    trackTotal('drops', 1);
  } else if (k.type === 'pow') {
    if (k.kind === 'shield') s.shields = Math.min(3, s.shields + 1);
    else s.power[k.kind] = powDur(k.kind);
    addScore(30);
    SFX.power();
    UI.toast(POWERUPS[k.kind].name, null, 'pow');
    puff(k.x + 6, k.y + 6, 16, [POWERUPS[k.kind].color, '#ffffff'], { spread: 60 });
    trackTotal('powerups', 1);
  }
}

function updateMatch(o, dt) {
  o.t += dt;
  if (o.phase === 'warn') {
    if (o.t >= o.warn) { o.phase = 'fall'; o.vy = 240; }
  } else if (o.phase === 'fall') {
    o.vy += 500 * dt;
    o.y += o.vy * dt;
    if (o.y + o.h >= GROUND) {
      o.phase = 'burn'; o.t = 0; o.y = GROUND - 6; o.h = 6; o.w = 6; o.x -= 1;
      puff(o.x + 3, GROUND, 8, ['#ffd23f', '#ff8a2a'], { vy: -30, spread: 30 });
    }
  } else {
    o.x -= state.speed * dt;
    if (o.t > 0.8) o.dead = true;
  }
}

function torchFlame(o) {
  if (o.type !== 'torch') return null;
  const c = o.ph % 2.4;
  return c >= 1.4 && c < 2.1 ? { x: o.x + 1, y: GROUND - 44, w: 5, h: 34 } : null;
}

function updateSwoop(dt, pb) {
  const s = state, p = player;
  const active = s.zone >= 1 || s.t > 28;
  s.swoopTimer -= dt;
  if (!s.swoop && active && s.swoopTimer <= 0) {
    s.swoop = { phase: 'warn', t: 0, x: Math.round(p.x + 13), warn: Math.max(0.5, 1.1 - s.zone * 0.1), beepT: 0 };
    s.swoopTimer = Math.max(3.5, rand(8, 12) - s.zone * 0.8);
  }
  const sw = s.swoop;
  if (!sw) return;
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
    if (sw.t >= 0.5) {
      if (!sw.repelled) { addScore(50); trackTotal('dodges', 1); }
      s.swoop = null;
      return;
    }
  }
  if ((sw.phase === 'hold' || (sw.phase === 'drop' && sw.t > 0.08)) && p.inv <= 0) {
    if (overlap(pb, { x: sw.x - 16, y: 0, w: 32, h: GROUND })) handReached('swoop');
  }
}

// ------------------------------------------------------------
//  Atrapado: la mano te prende
// ------------------------------------------------------------
const TAB = { x: W / 2 - 22, y: H / 2 + 6, s: 2 };
const tableauToScreen = (lx, ly) => ({ x: TAB.x + lx * TAB.s, y: TAB.y + ly * TAB.s });

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
      const tip = tableauToScreen(21, -3);
      state.particles.push({
        x: tip.x + rand(-1, 1), y: tip.y, vx: rand(-6, 6) + Math.sin(c.t * 2) * 6, vy: -rand(14, 24),
        life: 0, max: rand(1.6, 2.6), color: Math.random() < 0.5 ? '#b8b0c8' : '#8a80a0', size: 2, grow: 3.5, g: 0,
      });
    }
  }
  if (state.mode === 'caught' && c.t > 2.9) gameOver();
}

function gameOver() {
  const s = state;
  s.mode = 'over';
  s.overT = 0;
  s.score = Math.floor(s.score);
  const dist = Math.floor(s.dist);
  s.newBest = s.score > SAVE.best;
  SAVE.best = Math.max(SAVE.best, s.score);
  SAVE.bestDist = Math.max(SAVE.bestDist, dist);
  persist();
  UI.over();
}

function updateParticles(dt) {
  for (const q of state.particles) {
    q.life += dt;
    q.vy += q.g * dt;
    q.x += q.vx * dt; q.y += q.vy * dt;
    q.size += q.grow * dt;
  }
  state.particles = state.particles.filter(q => q.life < q.max);
  if (state.particles.length > 400) state.particles.splice(0, state.particles.length - 400);
}

// ------------------------------------------------------------
//  Render
// ------------------------------------------------------------
function drawZoneArt(art, alpha) {
  ctx.globalAlpha = alpha;
  ctx.drawImage(art.sky, 0, 0);
  const layer = (img, factor, y) => {
    const off = Math.floor((state.scroll * factor) % img.width);
    ctx.drawImage(img, -off, y);
    ctx.drawImage(img, img.width - off, y);
  };
  layer(art.far, 0.15, GROUND - 90);
  layer(art.near, 0.4, GROUND - 70);
  const [top, line, base, seam] = art.ground;
  ctx.fillStyle = top; ctx.fillRect(0, GROUND, W, 4);
  ctx.fillStyle = line; ctx.fillRect(0, GROUND, W, 1);
  ctx.fillStyle = base; ctx.fillRect(0, GROUND + 4, W, H - GROUND - 4);
  ctx.fillStyle = seam;
  const off = Math.floor(state.scroll % 24);
  for (let x = -off; x < W; x += 24) ctx.fillRect(x, GROUND + 1, 1, 3);
  for (let x = -Math.floor((state.scroll * 1.2) % 40); x < W; x += 40) ctx.fillRect(x, GROUND + 14, 20, 2);
  ctx.globalAlpha = 1;
}

function drawBackground() {
  const s = state;
  const cur = ZONE_ART[s.zone % ZONES.length];
  if (s.zoneFade > 0) {
    drawZoneArt(ZONE_ART[s.prevZone % ZONES.length], 1);
    drawZoneArt(cur, 1 - s.zoneFade);
  } else {
    drawZoneArt(cur, 1);
  }
  for (let i = 0; i < 8; i++) {
    if (Math.sin(s.t * 3 + i * 1.7) > 0.6) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect((i * 41 + 13) % W, (i * 23 + 7) % 80, 1, 1);
    }
  }
  // brasas flotando en el infierno
  if (s.zone % ZONES.length === 4 && s.mode === 'playing' && Math.random() < 0.3) {
    s.particles.push({ x: rand(0, W), y: GROUND, vx: -s.speed * 0.3, vy: -rand(20, 50), life: 0, max: 2, color: pick(['#ff6b4a', '#ffb02a']), size: 1, grow: 0, g: 0 });
  }
}

function porroFace() {
  const p = player, s = state;
  if (s.mode === 'playing' || s.mode === 'paused') {
    if (p.stun > 0) return 'hurt';
    if (p.angryT > 0) return 'angry';
    if (s.power.turbo > 0) return 'angry';
    if (p.x - s.handPos < 50 || (s.swoop && s.swoop.phase === 'warn')) return 'scared';
  }
  return p.blinkT < 0 ? 'blink' : 'normal';
}

function drawPlayer() {
  const p = player, s = state;
  const blinkInv = p.inv > 0 && s.power.turbo <= 0 && Math.floor(p.inv * 20) % 2 === 0 && s.mode === 'playing';
  if (!blinkInv) {
    const legs = p.duck ? 'none' : p.onGround ? 'run' : 'air';
    drawPorro(ctx, p.x, p.y, SAVE.skin, SAVE.acc, porroFace(), legs, Math.floor(p.anim * 10) % 2);
    if (porroFace() === 'scared' && Math.floor(s.t * 4) % 2 === 0) {
      ctx.fillStyle = '#4fb3ff';
      ctx.fillRect(Math.round(p.x) + 24, Math.round(p.y) - 16, 1, 2);
    }
  }
  if (s.shields > 0 && s.mode === 'playing') {
    ctx.globalAlpha = 0.55 + 0.15 * Math.sin(s.t * 6);
    ctx.drawImage(BUBBLE, Math.round(p.x) - 4, Math.round(p.y) - 22);
    ctx.globalAlpha = 1;
    if (s.shields > 1) {
      ctx.fillStyle = '#7fd6ff';
      for (let i = 0; i < s.shields; i++) ctx.fillRect(Math.round(p.x) + 8 + i * 4, Math.round(p.y) - 25, 2, 2);
    }
  }
  if (s.power.magnet > 0 && Math.floor(s.t * 8) % 2 === 0) {
    ctx.fillStyle = '#ff6b4a';
    ctx.fillRect(Math.round(p.x) + 12, Math.round(p.y) - 24, 3, 1);
  }
}

function drawObstacles() {
  const t = state.t;
  for (const o of state.obstacles) {
    const x = Math.round(o.x), y = Math.round(o.y);
    switch (o.type) {
      case 'lighter': {
        ctx.drawImage(o.spr, x, y);
        const fl = Math.floor(t * 12 + x) % 3;
        ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x + 2, y - 3 - (fl === 0 ? 1 : 0), 2, 3 + (fl === 0 ? 1 : 0));
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 2 + (fl === 2 ? 1 : 0), y - 2, 1, 2);
        break;
      }
      case 'ashtray':
        for (let i = 0; i < o.butts; i++) {
          const bx = x + 3 + i * 4;
          ctx.fillStyle = OUT; ctx.fillRect(bx - 1, y - 5 + (i % 2), 3, 5);
          ctx.fillStyle = '#d9a45b'; ctx.fillRect(bx, y - 4 + (i % 2), 1, 2);
          ctx.fillStyle = '#6d7389'; ctx.fillRect(bx, y - 5 + (i % 2), 1, 1);
        }
        ctx.drawImage(SPR.ashtray, x, y);
        break;
      case 'cup':
        ctx.drawImage(SPR.cup, x, y);
        break;
      case 'spark': {
        const fl = Math.floor(t * 20) % 2;
        ctx.fillStyle = '#e2352f'; ctx.fillRect(x, y, 8, 5);
        ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x + 1, y + 1, 6, 3);
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 1 + fl, y + 1, 3, 2);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1 + fl, y + 2, 1, 1);
        break;
      }
      case 'match':
        if (o.phase === 'warn') {
          if (Math.floor(o.t * 10) % 2 === 0) {
            ctx.fillStyle = '#ff6b4a';
            ctx.fillRect(x, 4, 3, 7); ctx.fillRect(x, 13, 3, 2);
          }
          ctx.fillStyle = 'rgba(10,5,20,0.5)';
          ctx.fillRect(x - 2, GROUND - 1, 8, 2);
        } else if (o.phase === 'fall') {
          ctx.fillStyle = OUT; ctx.fillRect(x - 1, y - 1, 4, 13);
          ctx.fillStyle = '#e8c890'; ctx.fillRect(x, y, 2, 10);
          ctx.fillStyle = '#e2352f'; ctx.fillRect(x - 1, y + 10, 4, 3);
          ctx.fillStyle = Math.floor(t * 20) % 2 ? '#ffd23f' : '#ff8a2a';
          ctx.fillRect(x - 1, y + 13, 4, 3);
        } else {
          const fl = Math.floor(t * 16) % 2;
          ctx.fillStyle = '#e2352f'; ctx.fillRect(x, y + 2, 6, 4);
          ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x + 1, y + fl, 4, 5);
          ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 2, y + 2 + fl, 2, 3);
        }
        break;
      case 'torch': {
        ctx.drawImage(SPR.torch, x, y);
        const c = o.ph % 2.4, fl = Math.floor(t * 20) % 2;
        if (c >= 1.0 && c < 1.4) {
          ctx.fillStyle = '#4fb3ff'; ctx.fillRect(x + 2, y - 3, 3, 3);
        } else if (c >= 1.4 && c < 2.1) {
          ctx.fillStyle = '#e2352f'; ctx.fillRect(x + 1, GROUND - 44, 5, 34);
          ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x + 1 + fl, GROUND - 42, 4 - fl, 32);
          ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 2, GROUND - 36 + fl * 2, 3, 24);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, GROUND - 24, 1, 12);
        }
        break;
      }
    }
  }
}

function drawPickups() {
  for (const k of state.pickups) {
    const y = Math.round(k.y + Math.sin(k.ph * 5) * 1.5), x = Math.round(k.x);
    if (k.type === 'leaf') ctx.drawImage(SPR.leaf, x, y);
    else if (k.type === 'drop') {
      ctx.drawImage(SPR.drop, x, y);
      if (Math.floor(state.t * 6) % 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 8, y, 1, 1); }
    } else {
      ctx.drawImage(POW_SPR[k.kind], x, y);
      if (Math.floor(state.t * 5) % 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 12, y - 1, 1, 1); ctx.fillRect(x - 1, y + 10, 1, 1); }
    }
  }
}

function drawParticles() {
  for (const q of state.particles) {
    ctx.globalAlpha = clamp((1 - q.life / q.max) * 1.2, 0, 1);
    ctx.fillStyle = q.color;
    const sz = Math.max(1, Math.round(q.size));
    ctx.fillRect(Math.round(q.x - sz / 2), Math.round(q.y - sz / 2), sz, sz);
  }
  ctx.globalAlpha = 1;
}

function drawChaseHand() {
  const s = state;
  const shake = s.handStun > 0 ? Math.round(Math.sin(s.t * 40) * 1.5) : 0;
  drawHand(s.handPos - handReach(s.handGrip) + shake, s.handY, s.handGrip);
}

function drawSwoop() {
  const sw = state.swoop;
  if (!sw) return;
  let shadowW = 0;
  if (sw.phase === 'warn') shadowW = Math.round(8 + 24 * (sw.t / sw.warn));
  else if (sw.phase !== 'rise') shadowW = 32;
  if (shadowW) {
    ctx.fillStyle = 'rgba(10,5,20,0.6)';
    ctx.fillRect(sw.x - shadowW / 2, GROUND - 1, shadowW, 3);
    ctx.fillRect(sw.x - shadowW / 2 + 2, GROUND - 2, shadowW - 4, 1);
    if (sw.phase === 'warn' && Math.floor(sw.t * 8) % 2 === 0) {
      ctx.fillStyle = '#ff6b4a';
      ctx.fillRect(sw.x - 1, GROUND - 34, 2, 7);
      ctx.fillRect(sw.x - 1, GROUND - 25, 2, 2);
    }
  }
  const tipGround = GROUND - 1;
  let tipY;
  if (sw.phase === 'warn') tipY = 8 + Math.sin(sw.t * 30) * 2;
  else if (sw.phase === 'drop') tipY = lerp(0, tipGround, sw.t / 0.15);
  else if (sw.phase === 'hold') tipY = tipGround;
  else tipY = lerp(sw.repelled ? Math.min(tipGround, 80) : tipGround, -20, sw.t / 0.5);
  const grip = sw.phase === 'hold' ? Math.min(1, sw.t * 4) : sw.phase === 'rise' ? (sw.repelled ? 0 : 1) : 0.1;
  drawHand(sw.x - 4, tipY - handReach(grip), grip, Math.PI / 2);
}

function drawCaught() {
  const c = state.caught, p = player;
  if (c.t < 0.7) {
    const k = c.t / 0.7;
    drawPorro(ctx, p.x + Math.sin(c.t * 60), p.y, SAVE.skin, SAVE.acc, 'scared', 'air', 0);
    if (c.by === 'hand') {
      const g = lerp(state.handGrip, 1, k);
      drawHand(p.x + 8 - handReach(g), p.y - 8, g);
    } else {
      const g = lerp(0.3, 1, k);
      drawHand(state.swoop.x - 4, GROUND - 1 - handReach(g), g, Math.PI / 2);
    }
    return;
  }
  const fade = clamp((c.t - 0.7) / 0.25, 0, 1);
  ctx.fillStyle = `rgba(13,10,20,${0.82 * fade})`;
  ctx.fillRect(0, 0, W, H);
  if (c.t < 0.9) return;

  ctx.save();
  ctx.translate(TAB.x, TAB.y);
  ctx.scale(TAB.s, TAB.s);
  const lit = c.t > 1.7;
  const face = c.t > 2.2 ? 'stoned' : 'scared';
  const shake = c.t < 1.7 ? Math.round(Math.sin(c.t * 50) * 0.6) : 0;
  // el porro sale del puño con la boquilla adentro
  ctx.drawImage(porroSprite(SAVE.skin, SAVE.acc, face), -5 + shake, -13);
  if (lit) {
    const fl = Math.floor(c.t * 8) % 2;
    ctx.fillStyle = '#e2352f'; ctx.fillRect(19, -4, 3, 3);
    ctx.fillStyle = fl ? '#ffd23f' : '#ff8a2a'; ctx.fillRect(20, -4 + fl, 2, 2);
    ctx.fillStyle = '#4a4458'; ctx.fillRect(18, -4, 1, 3);
  }
  drawHand(0, 0, 1);
  if (c.t > 1.0 && c.t < 2.4) {
    const inK = clamp((c.t - 1.0) / 0.5, 0, 1), outK = clamp((c.t - 2.0) / 0.4, 0, 1);
    const ly = Math.round(lerp(60, 3, inK) + outK * 60);
    ctx.drawImage(LIGHTERS[0], 18, ly);
    if (c.t > 1.55) {
      const fl = Math.floor(c.t * 14) % 2;
      ctx.fillStyle = '#ff8a2a'; ctx.fillRect(19 - fl, ly - 5, 4, 5);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(20 - fl, ly - 4, 2, 4);
    }
  }
  ctx.restore();
}

function render() {
  const s = state;
  ctx.save();
  if (s.shake > 0) ctx.translate(Math.round(rand(-1, 1) * s.shake), Math.round(rand(-1, 1) * s.shake));
  drawBackground();
  drawPickups();
  drawObstacles();
  if (s.mode === 'caught' || s.mode === 'over') {
    drawCaught();
  } else {
    drawPlayer();
    drawChaseHand();
    drawSwoop();
  }
  drawParticles();
  ctx.restore();
  if (s.flash > 0) {
    ctx.fillStyle = `rgba(255,107,74,${s.flash * 0.25})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (s.power.turbo > 0 && s.mode === 'playing') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 6; i++) {
      const y = (i * 29 + Math.floor(s.t * 300)) % (GROUND - 10);
      ctx.fillRect((W - ((s.t * 900 + i * 97) % (W + 60))), y, 30, 1);
    }
  }
}

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

state = baseState('menu');
player = newPlayer();
UI.init();
toMenu();
const daily = claimDaily();
if (daily) setTimeout(() => UI.toast(`BONO DIARIO +${daily.reward}`, `Racha de ${daily.streak} día${daily.streak > 1 ? 's' : ''}. Vuelve mañana por más.`, 'gold'), 600);
requestAnimationFrame(frame);
