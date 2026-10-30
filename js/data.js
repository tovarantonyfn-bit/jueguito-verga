'use strict';

// ============================================================
//  Datos del juego: zonas, skins, accesorios, mejoras, misiones
// ============================================================

const W = 320, H = 180, GROUND = 150;
const ZONE_LEN = 500; // metros por zona

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Cada zona: colores del fondo y qué obstáculos aparecen.
const ZONES = [
  {
    name: 'LA CALLE',
    sky: ['#120c22', '#1a1030', '#24143e', '#33184a', '#481d55', '#5e2459'], moon: ['#f5eec8', '#d8cfa8'],
    far: ['#2a1840', '#6b4f8a'], near: ['#1b1129', '#ffcf6a'], nearKind: 'city',
    ground: ['#3a2f4a', '#5a4f70', '#2a2236', '#1b1424'],
    obs: ['lighter', 'lighter', 'ashtray'],
  },
  {
    name: 'LA FIESTA',
    sky: ['#0b0820', '#141040', '#1f1460', '#2e1670', '#45187a', '#6a1a7a'], moon: ['#ffd1f0', '#e09ad0'],
    far: ['#26164a', '#ff6fae'], near: ['#150c2c', '#4fe3ff'], nearKind: 'city',
    ground: ['#3b2052', '#7a3f9a', '#24143a', '#120a1e'],
    obs: ['lighter', 'ashtray', 'cup', 'cup', 'spark'],
  },
  {
    name: 'EL PARQUE',
    sky: ['#07141a', '#0b1f24', '#0f2a2c', '#143630', '#1c4334', '#285038'], moon: ['#f0f5d8', '#c8d4a8'],
    far: ['#10302a', '#3f7a5a'], near: ['#0a1f18', '#ffe08a'], nearKind: 'trees',
    ground: ['#2f4a2a', '#4f7a3f', '#1f3320', '#12200f'],
    obs: ['lighter', 'ashtray', 'cup', 'spark', 'match', 'match'],
  },
  {
    name: 'LA AZOTEA',
    sky: ['#1a0f08', '#2a160c', '#3d1f10', '#5a2a12', '#7a3a14', '#a14f1a'], moon: ['#ffe9b0', '#e0b870'],
    far: ['#3a1d14', '#ff9a4a'], near: ['#1f100a', '#ffd36a'], nearKind: 'city',
    ground: ['#4a3a32', '#6f5a4f', '#2f241f', '#1a1310'],
    obs: ['lighter', 'cup', 'spark', 'match', 'torch', 'torch'],
  },
  {
    name: 'EL INFIERNO',
    sky: ['#1a0406', '#2a060a', '#40080e', '#5c0c10', '#7a1410', '#a8200e'], moon: ['#ff6b4a', '#c43a2a'],
    far: ['#3a0a0e', '#ff4a2a'], near: ['#1e0508', '#ffb02a'], nearKind: 'city',
    ground: ['#4a1a1a', '#7a2a20', '#2a0e0e', '#160606'],
    obs: ['lighter', 'ashtray', 'cup', 'spark', 'match', 'torch'],
  },
];
const zoneData = (z) => ZONES[z % ZONES.length];
const zoneName = (z) => zoneData(z).name + (z >= ZONES.length ? ` +${Math.floor(z / ZONES.length)}` : '');

// Papeles (skins). pattern(x, y, largo) devuelve un color o null para usar el papel base.
const SKINS = [
  { id: 'clasico', name: 'Clásico', price: 0, paper: '#f3ecdc', speck: '#6dbb4f' },
  { id: 'natural', name: 'Natural', price: 100, paper: '#d2ae82', speck: '#5a8a3a' },
  { id: 'rasta', name: 'Rasta', price: 250, paper: '#f3ecdc',
    pattern: (x) => ['#e2352f', '#ffd23f', '#3fbf5a'][Math.floor(x / 3) % 3] },
  { id: 'tricolor', name: 'Tricolor', price: 300, paper: '#f3ecdc',
    pattern: (x, y, L) => (x < L / 3 ? '#2e9a4a' : x < (2 * L) / 3 ? null : '#d8343a') },
  { id: 'blunt', name: 'Blunt', price: 350, paper: '#7a4a26', filter: '#5a3418',
    pattern: (x, y) => ((x + y) % 5 === 0 ? '#5a3418' : null) },
  { id: 'camuflaje', name: 'Camuflaje', price: 450, paper: '#5f7a3a',
    pattern: (x, y) => ((x * 7 + y * 3) % 9 < 2 ? '#3f2f1f' : (x * 5 + y * 11) % 13 < 3 ? '#8aa860' : null) },
  { id: 'arcoiris', name: 'Arcoíris', price: 600, paper: '#f3ecdc',
    pattern: (x) => ['#e2352f', '#ff8a2a', '#ffd23f', '#3fbf5a', '#2f8de2', '#8a4fd8'][Math.floor(x / 2) % 6] },
  { id: 'galaxia', name: 'Galaxia', price: 800, paper: '#2a1650', filter: '#3a2f4a',
    pattern: (x, y) => ((x * 13 + y * 7) % 17 === 0 ? '#ffffff' : (x * 5 + y * 3) % 23 === 0 ? '#ff6fae' : null) },
  { id: 'neon', name: 'Neón', price: 1000, paper: '#2a2236', filter: '#1b1424',
    pattern: (x) => (x % 4 === 0 ? '#4fe3ff' : x % 4 === 2 ? '#ff6fae' : null) },
  { id: 'oro', name: 'Oro', price: 2000, paper: '#ffd23f', filter: '#c48a1d', shine: true },
  { id: 'diamante', name: 'Diamante', price: 4000, paper: '#bff4ff', filter: '#6fc8e8', shine: true,
    pattern: (x, y) => ((x + y) % 6 === 0 ? '#ffffff' : null),
    req: { bestDist: 2500, text: 'Llega a 2500 m' } },
];

const ACCS = [
  { id: 'none', name: 'Nada', price: 0 },
  { id: 'lentes', name: 'Lentes', price: 150 },
  { id: 'gorra', name: 'Gorra', price: 200 },
  { id: 'bandana', name: 'Bandana', price: 250 },
  { id: 'audifonos', name: 'Audífonos', price: 350 },
  { id: 'sombrero', name: 'Sombrero', price: 500 },
  { id: 'corona', name: 'Corona', price: 1500, req: { maxZone: 4, text: 'Llega a EL INFIERNO' } },
];

const UPGRADES = [
  { id: 'smoke', name: 'Pulmones', desc: 'El humo se carga más rápido y empuja más a la mano', cost: [50, 120, 240, 400, 650] },
  { id: 'shield', name: 'Papel grueso', desc: 'Empiezas cada partida con escudos', cost: [80, 200, 450] },
  { id: 'magnet', name: 'Imán', desc: 'Atraes las hojas que pasan cerca', cost: [40, 90, 180, 320, 500] },
  { id: 'legs', name: 'Patitas', desc: 'Te mueves más rápido de lado a lado', cost: [50, 120, 250, 450] },
  { id: 'water', name: 'Gotas', desc: 'Las gotas alejan más a la mano', cost: [60, 150, 300] },
  { id: 'power', name: 'Power-ups largos', desc: 'Imán, turbo y x2 duran más', cost: [70, 160, 320, 550] },
  { id: 'luck', name: 'Suerte', desc: 'Salen power-ups más seguido', cost: [80, 180, 350, 600] },
  { id: 'jump', name: 'Triple salto', desc: 'Un salto extra en el aire', cost: [400] },
];

const POWERUPS = {
  shield: { name: 'ESCUDO', color: '#4fb3ff' },
  magnet: { name: 'IMÁN', color: '#ff6b4a', dur: 10 },
  turbo: { name: 'TURBO', color: '#ffd23f', dur: 4 },
  x2: { name: 'HOJAS x2', color: '#8fdc6a', dur: 12 },
};

// Rangos: subes uno cada 3 misiones. Cada rango da +10% de puntos.
const RANKS = ['Bachita', 'Churrito', 'Porrito', 'Toque', 'Gallo', 'Leño', 'Bazuca', 'Cohete', 'Leyenda'];

// scope 'run': se cumple en una sola partida. scope 'total': se va sumando entre partidas.
const MISSION_TYPES = [
  { id: 'leaves_run', scope: 'run', stat: 'leaves', text: (n) => `Junta ${n} hojas en una partida`, target: (t) => 20 + 12 * t },
  { id: 'dist_run', scope: 'run', stat: 'dist', text: (n) => `Corre ${n} m en una partida`, target: (t) => 300 + 200 * t },
  { id: 'nohit_run', scope: 'run', stat: 'noHit', text: (n) => `Corre ${n} m sin chocar`, target: (t) => 150 + 100 * t },
  { id: 'zone_run', scope: 'run', stat: 'zone', text: (n) => `Llega a la zona ${n}`, target: (t) => Math.min(2 + Math.floor(t / 2), 6) },
  { id: 'stomps', scope: 'total', stat: 'stomps', text: (n) => `Pisa ${n} obstáculos`, target: (t) => 5 + 3 * t },
  { id: 'smokes', scope: 'total', stat: 'smokes', text: (n) => `Échale humo a la mano ${n} veces`, target: (t) => 2 + t },
  { id: 'dodges', scope: 'total', stat: 'dodges', text: (n) => `Esquiva ${n} manotazos de arriba`, target: (t) => 3 + 2 * t },
  { id: 'drops', scope: 'total', stat: 'drops', text: (n) => `Agarra ${n} gotas`, target: (t) => 3 + t },
  { id: 'powerups', scope: 'total', stat: 'powerups', text: (n) => `Agarra ${n} power-ups`, target: (t) => 3 + 2 * t },
  { id: 'runs', scope: 'total', stat: 'runs', text: (n) => `Juega ${n} partidas`, target: (t) => 3 + t },
];
