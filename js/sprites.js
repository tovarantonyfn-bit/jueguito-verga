'use strict';

// ============================================================
//  Gráficos: el porro, obstáculos, items, fondos y la mano
// ============================================================

const cvs = $('game');
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false;
const OUT = '#1b1424';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function paintGrid(grid) {
  const c = makeCanvas(grid[0].length, grid.length);
  const g = c.getContext('2d');
  grid.forEach((row, y) => row.forEach((col, x) => {
    if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
  }));
  return c;
}

function makeSprite(rows, pal) {
  const w = Math.max(...rows.map(r => r.length));
  return paintGrid(rows.map(r => Array.from({ length: w }, (_, x) => pal[r[x]] || null)));
}

function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
// f > 0 aclara, f < 0 oscurece
function tint(h, f) {
  const [r, g, b] = hexToRgb(h);
  return f >= 0 ? rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f)
    : rgbToHex(r * (1 + f), g * (1 + f), b * (1 + f));
}

const PAL = {
  K: OUT, W: '#f3ecdc', w: '#cfc3a8', G: '#6dbb4f', g: '#3f7a34',
  T: '#d9a45b', t: '#a8743a', E: '#ffffff', S: '#b8bed0', s: '#6d7389',
  B: '#4fb3ff', b: '#2b6fd1', P: '#ffffff',
};

// ------------------------------------------------------------
//  El porro: un cono acostado (boquilla atrás, punta torcida al frente)
//  Se genera por código para poder cambiarle el papel y accesorios.
// ------------------------------------------------------------
const PORRO = { L: 22, FIL: 6, CY: 11, GW: 30, GH: 17 };
// patas: la de atrás en x+7, la de adelante en x+17; los pies quedan 18 px debajo del borde superior del sprite
function porroHalf(x) {
  return x < PORRO.FIL ? 2 : 2 + ((x - PORRO.FIL) / (PORRO.L - 1 - PORRO.FIL)) * 1.6;
}

const ACC_BACK = {
  gorra(set) {
    for (let x = 15; x <= 19; x++) set(x, 5, '#e2352f');
    for (let x = 14; x <= 20; x++) { set(x, 6, '#e2352f'); set(x, 7, '#b8262a'); }
    for (let x = 21; x <= 24; x++) set(x, 7, '#8c1c24');
    set(17, 6, '#ffffff');
  },
  sombrero(set) {
    for (let x = 11; x <= 25; x++) set(x, 7, '#d9a45b');
    set(11, 6, '#d9a45b'); set(25, 6, '#d9a45b');
    for (let y = 3; y <= 6; y++) for (let x = 15; x <= 21; x++) set(x, y, y === 6 ? '#e2352f' : '#e8bb72');
    for (let x = 16; x <= 20; x++) set(x, 2, '#e8bb72');
    set(17, 6, '#3fbf5a'); set(19, 6, '#ffffff');
  },
  corona(set) {
    const gold = '#ffd23f';
    for (let x = 15; x <= 21; x++) { set(x, 7, gold); set(x, 6, gold); }
    [15, 18, 21].forEach(x => { set(x, 5, gold); set(x, 4, gold); });
    [16, 20].forEach(x => set(x, 5, gold));
    set(18, 6, '#e2352f');
  },
  audifonos(set) {
    for (let x = 14; x <= 21; x++) set(x, 6, '#3a2f4a');
    set(13, 7, '#3a2f4a'); set(22, 7, '#3a2f4a');
    for (let y = 8; y <= 11; y++) { set(12, y, '#e2352f'); set(13, y, '#e2352f'); }
    set(12, 9, '#ff8a8a');
  },
  bandana(set) {
    for (let y = 8; y <= 14; y++) { set(12, y, '#e2352f'); set(13, y, '#e2352f'); }
    set(12, 10, '#ffffff'); set(13, 12, '#ffffff');
    set(11, 7, '#e2352f'); set(10, 6, '#e2352f'); set(9, 6, '#e2352f'); set(10, 8, '#c42a26'); set(9, 9, '#c42a26');
  },
};

const ACC_FRONT = {
  lentes(o) {
    for (let x = 14; x <= 21; x++) o[9][x] = OUT;
    [15, 16, 19, 20].forEach(x => { o[10][x] = OUT; });
    o[9][15] = '#6fd0ff'; o[9][19] = '#6fd0ff';
  },
};

function drawFace(o, face) {
  const E = '#ffffff', K = OUT, ey = 9, eyes = [15, 19];
  const white = (x) => { o[ey][x] = E; o[ey][x + 1] = E; o[ey + 1][x] = E; o[ey + 1][x + 1] = E; };
  const px = (pts) => pts.forEach(([x, y]) => { o[y][x] = K; });
  switch (face) {
    case 'blink':
      eyes.forEach(x => px([[x, ey + 1], [x + 1, ey + 1]]));
      px([[17, 12], [18, 12]]);
      break;
    case 'scared':
      eyes.forEach(x => { white(x); px([[x, ey + 1]]); });
      px([[17, 12], [18, 12], [17, 13], [18, 13]]);
      break;
    case 'angry':
      eyes.forEach(x => { white(x); px([[x + 1, ey + 1]]); });
      px([[16, ey], [19, ey], [16, 12], [17, 12], [18, 12], [19, 12]]);
      break;
    case 'hurt':
      eyes.forEach(x => px([[x, ey], [x + 1, ey + 1]]));
      px([[16, 12], [17, 13], [18, 12], [19, 13]]);
      break;
    case 'stoned':
      eyes.forEach(x => { px([[x, ey], [x + 1, ey], [x + 1, ey + 1]]); o[ey + 1][x] = '#ff9a9a'; });
      px([[16, 12], [17, 13], [18, 13], [19, 12]]);
      break;
    default:
      eyes.forEach(x => { white(x); px([[x + 1, ey + 1]]); });
      px([[16, 12], [17, 13], [18, 13], [19, 12]]);
  }
}

const porroCache = new Map();
function porroSprite(skinId, accId, face = 'normal') {
  const key = `${skinId}|${accId}|${face}`;
  if (porroCache.has(key)) return porroCache.get(key);
  const skin = SKINS.find(s => s.id === skinId) || SKINS[0];
  const { L, FIL, CY, GW, GH } = PORRO;
  const g = Array.from({ length: GH }, () => Array(GW).fill(null));
  const set = (x, y, col) => { if (x >= 0 && x < GW && y >= 0 && y < GH) g[y][x] = col; };
  const paper = skin.paper, fil = skin.filter || '#d9a45b';

  for (let x = 0; x < L; x++) {
    const top = Math.round(CY - porroHalf(x)), bot = Math.round(CY + porroHalf(x));
    for (let y = top; y <= bot; y++) {
      let col;
      if (x < FIL) {
        col = x === 0 ? tint(fil, -0.3) : (x % 2 ? fil : tint(fil, -0.12));
      } else {
        col = (skin.pattern && skin.pattern(x - FIL, y - top, L - FIL)) || paper;
        if (skin.speck && (x * 7 + y * 13) % 11 === 0) col = skin.speck;
      }
      if (y === top) col = tint(col, 0.3);
      else if (y === bot) col = tint(col, -0.35);
      else if (y === bot - 1) col = tint(col, -0.15);
      set(x + 1, y, col);
    }
  }
  // punta torcida
  [[L, [-1, 0, 1]], [L + 1, [-1, 0]], [L + 2, [-1]], [L + 3, [-2]]].forEach(([x, ys], i) =>
    ys.forEach(dy => set(x + 1, CY + dy, i % 2 ? tint(paper, -0.25) : tint(paper, 0.1))));
  if (skin.shine) { set(FIL + 3, 9, '#ffffff'); set(FIL + 4, 9, '#ffffff'); set(FIL + 9, 8, '#ffffff'); }

  if (ACC_BACK[accId]) ACC_BACK[accId](set);

  // contorno automático
  const o = g.map(r => r.slice());
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      if (g[y][x]) continue;
      if ((g[y - 1] && g[y - 1][x]) || (g[y + 1] && g[y + 1][x]) || g[y][x - 1] || g[y][x + 1]) o[y][x] = OUT;
    }
  }
  drawFace(o, face);
  if (ACC_FRONT[accId]) ACC_FRONT[accId](o);

  const c = paintGrid(o);
  porroCache.set(key, c);
  return c;
}

// Dibuja el porro con sus patitas. legs: 'run' | 'air' | 'stand' | 'none' (acostado)
function drawPorro(g, x, footY, skin, acc, face, legs, frame) {
  x = Math.round(x); footY = Math.round(footY);
  const spr = porroSprite(skin, acc, face);
  if (legs === 'none') { g.drawImage(spr, x, footY - 16); return; }
  g.drawImage(spr, x, footY - 18);
  g.fillStyle = OUT;
  if (legs === 'run') {
    const a = frame ? 1 : -1;
    g.fillRect(x + 7 + a, footY - 4, 1, 4); g.fillRect(x + 7 + a, footY - 1, 2, 1);
    g.fillRect(x + 17 - a, footY - 3, 1, 3); g.fillRect(x + 17 - a, footY - 1, 2, 1);
  } else if (legs === 'air') {
    g.fillRect(x + 7, footY - 4, 1, 2); g.fillRect(x + 6, footY - 2, 1, 1);
    g.fillRect(x + 17, footY - 3, 1, 2); g.fillRect(x + 16, footY - 1, 1, 1);
  } else {
    g.fillRect(x + 7, footY - 4, 1, 4); g.fillRect(x + 7, footY - 1, 2, 1);
    g.fillRect(x + 17, footY - 3, 1, 3); g.fillRect(x + 17, footY - 1, 2, 1);
  }
}

// ------------------------------------------------------------
//  Obstáculos e items
// ------------------------------------------------------------
function lighterSprite(body, shade) {
  return makeSprite([
    '.KKKK.', 'KSSSsK', 'KSsSsK', 'KKKKKK', 'KRRRrK', 'KRPRrK',
    'KRRRrK', 'KRRRrK', 'KRRRrK', 'KRRRrK', 'KRRRrK', 'KKKKKK',
  ], { ...PAL, R: body, r: shade });
}
const LIGHTERS = [
  lighterSprite('#e2352f', '#9c1f2a'), lighterSprite('#2f8de2', '#1f4f9c'),
  lighterSprite('#3fbf5a', '#21753a'), lighterSprite('#ffd23f', '#c48a1d'),
];

const SPR = {
  ashtray: makeSprite([
    '.KKKKKKKKKKKKKK.', 'KSSsSSSSSSSSsSSK', 'KsSSSSSSSSSSSSsK',
    '.KsSSSSSSSSSSsK.', '.KssSSSSSSSSssK.', '..KKKKKKKKKKKK..',
  ], PAL),
  cup: makeSprite([
    'KKKKKKKKK', 'KWWWWWWWK', 'KRRRRRRrK', 'KRWRRRRrK', '.KRRRRrK.',
    '.KRWRRrK.', '.KRRRRrK.', '.KRRRRrK.', '..KRRrK..', '..KKKKK..',
  ], { ...PAL, R: '#e2352f', r: '#9c1f2a' }),
  torch: makeSprite([
    '..KKK..', '..KsK..', '.KKKKK.', 'KBBBBbK', 'KBEBBbK',
    'KBEBBbK', 'KBBBBbK', 'KBBBBbK', 'KBBBBbK', 'KKKKKKK',
  ], PAL),
  leaf: makeSprite([
    '....g....', '...gGg...', 'g..gGg..g', 'gG.gGg.Gg', '.gGgGgGg.',
    '..gGGGg..', '.gG.g.Gg.', '....g....', '....g....',
  ], PAL),
  drop: makeSprite([
    '...K...', '..KBK..', '..KBK..', '.KBBBK.', 'KBEBBbK',
    'KBEBBbK', 'KBBBBbK', '.KbbbK.', '..KKK..',
  ], PAL),
};

const POW_ICONS = {
  shield: ['.###.', '#####', '#####', '.###.', '..#..'],
  magnet: ['#...#', '#...#', '#...#', '#...#', '.###.'],
  turbo: ['...#.', '..#..', '.###.', '..#..', '.#...'],
  x2: ['###..', '..#..', '###..', '#....', '###..'],
};
function powSprite(kind) {
  const col = POWERUPS[kind].color;
  const grid = Array.from({ length: 13 }, (_, y) => Array.from({ length: 13 }, (_, x) => {
    const d = Math.hypot(x - 6, y - 6);
    return d <= 6.3 ? (d > 5.1 ? col : '#1b1424') : null;
  }));
  POW_ICONS[kind].forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') grid[y + 4][x + 4] = col; }));
  if (kind === 'x2') { grid[8][9] = col; grid[7][8] = col; grid[7][10] = col; grid[9][8] = col; grid[9][10] = col; }
  grid[3][4] = '#ffffff';
  return paintGrid(grid);
}
const POW_SPR = Object.fromEntries(Object.keys(POWERUPS).map(k => [k, powSprite(k)]));

const BUBBLE = (() => {
  const w = 36, h = 26;
  return paintGrid(Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => {
    const e = ((x - 17.5) / 17) ** 2 + ((y - 12.5) / 12) ** 2;
    if (e > 1) return null;
    if (e > 0.82) return '#7fd6ff';
    return (x + y) % 9 === 0 && y < 10 ? '#d8f4ff' : null;
  })));
})();

// ------------------------------------------------------------
//  Fondos por zona
// ------------------------------------------------------------
function seeded(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function makeSky(z) {
  const c = makeCanvas(W, H), g = c.getContext('2d');
  const bh = Math.ceil(GROUND / z.sky.length);
  z.sky.forEach((col, i) => {
    g.fillStyle = col; g.fillRect(0, i * bh, W, bh);
    if (i > 0) for (let x = 0; x < W; x += 2) { g.fillRect(x, i * bh - 2, 1, 1); g.fillRect(x + 1, i * bh - 1, 1, 1); }
  });
  const r = seeded(7);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = r() < 0.2 ? '#ffd9f0' : '#cfc3e8';
    g.fillRect(Math.floor(r() * W), Math.floor(r() * 90), 1, 1);
  }
  const mx = 260, my = 30, mr = 13;
  for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) {
    const d = x * x + y * y;
    if (d <= mr * mr) { g.fillStyle = d > (mr - 1.5) ** 2 ? z.moon[1] : z.moon[0]; g.fillRect(mx + x, my + y, 1, 1); }
  }
  g.fillStyle = z.moon[1];
  [[-4, -3, 3], [3, 4, 2], [5, -5, 2], [-3, 6, 2]].forEach(([x, y, s]) => g.fillRect(mx + x, my + y, s, s));
  return c;
}

function makeSkyline(w, h, seed, col, winCol, minH, maxH, winChance) {
  const c = makeCanvas(w, h), g = c.getContext('2d'), r = seeded(seed);
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

function makeTrees(w, h, seed, col, light) {
  const c = makeCanvas(w, h), g = c.getContext('2d'), r = seeded(seed);
  let x = 0;
  while (x < w - 30) {
    const rad = Math.floor(8 + r() * 12), th = Math.floor(10 + r() * 20), cx = x + rad;
    g.fillStyle = col;
    g.fillRect(cx - 1, h - th, 3, th);
    const cy = h - th - Math.floor(rad * 0.6);
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy <= rad * rad) g.fillRect(cx + dx, cy + dy, 1, 1);
    }
    if (r() < 0.4) {
      const lx = x + rad * 2 + 3;
      g.fillStyle = col;
      g.fillRect(lx, h - 34, 1, 34); g.fillRect(lx - 1, h - 35, 4, 2);
      g.fillStyle = light; g.fillRect(lx, h - 33, 2, 1);
    }
    x += rad * 2 + Math.floor(r() * 8);
  }
  return c;
}

const ZONE_ART = ZONES.map((z, i) => ({
  sky: makeSky(z),
  far: makeSkyline(480, 90, 11 + i * 5, z.far[0], z.far[1], 30, 80, 0.25),
  near: z.nearKind === 'trees'
    ? makeTrees(480, 70, 23 + i, z.near[0], z.near[1])
    : makeSkyline(480, 70, 23 + i * 3, z.near[0], z.near[1], 20, 60, 0.18),
  ground: z.ground,
}));

// ------------------------------------------------------------
//  La mano (rectángulos para poder animar los dedos)
// ------------------------------------------------------------
const SKIN = '#e9b48a', SKIN_D = '#c3855d', NAIL = '#f8d9c4';
const SLEEVE = '#6a3fa0', SLEEVE_D = '#47286f', CUFF = '#8d63c9';
const FINGERS = [15, 18, 17, 13];

const fingerLen = (i, grip) => Math.max(3, Math.round(FINGERS[i] * (1 - 0.8 * grip)));
const handReach = (grip) => fingerLen(1, grip);

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
