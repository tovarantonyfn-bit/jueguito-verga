'use strict';

// ============================================================
//  Guardado (localStorage), misiones, rangos y bono diario
// ============================================================

const SAVE_KEY = 'qnmf-save-v2';

function defaultSave() {
  return {
    wallet: 0, best: 0, bestDist: 0, maxZone: 0,
    upgrades: {}, skins: ['clasico'], accs: ['none'], skin: 'clasico', acc: 'none',
    missions: [], missionsDone: 0, stats: { runs: 0 },
    daily: { last: '', streak: 0 }, muted: false,
  };
}

function loadSave() {
  const d = defaultSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      Object.assign(d, o);
      d.upgrades = Object.assign({}, o.upgrades);
      d.stats = Object.assign({ runs: 0 }, o.stats);
      d.daily = Object.assign({ last: '', streak: 0 }, o.daily);
    } else {
      // récord de la versión anterior
      const old = parseInt(localStorage.getItem('qnmf-best') || '0', 10);
      if (old) d.bestDist = old;
    }
  } catch (e) { /* sin storage: se juega igual, solo no se guarda */ }
  if (!SKINS.some(s => s.id === d.skin)) d.skin = 'clasico';
  if (!ACCS.some(a => a.id === d.acc)) d.acc = 'none';
  return d;
}

const SAVE = loadSave();

function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { /* nada */ }
}
addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

const upg = (id) => SAVE.upgrades[id] || 0;
const rankIndex = () => Math.min(RANKS.length - 1, Math.floor(SAVE.missionsDone / 3));
const rankMult = () => 1 + rankIndex() * 0.1;

// ---------------- Misiones ----------------
const missionDef = (m) => MISSION_TYPES.find(t => t.id === m.type);
const missionText = (m) => missionDef(m).text(m.target);

function newMission(exclude) {
  const tier = Math.floor(SAVE.missionsDone / 3) + (Math.random() < 0.5 ? 0 : 1);
  const pool = MISSION_TYPES.filter(t => !exclude.includes(t.id));
  const t = pick(pool);
  // las misiones de "una partida" empiezan a contar en la siguiente partida
  return { type: t.id, target: t.target(tier), progress: 0, reward: 25 + 15 * tier, fresh: t.scope === 'run' };
}

function ensureMissions() {
  SAVE.missions = SAVE.missions.filter(m => missionDef(m));
  while (SAVE.missions.length < 3) SAVE.missions.push(newMission(SAVE.missions.map(m => m.type)));
}
ensureMissions();

function missionsRunStart() {
  for (const m of SAVE.missions) m.fresh = false;
}

function trackTotal(stat, n = 1) {
  for (const m of SAVE.missions) {
    const d = missionDef(m);
    if (d.scope === 'total' && d.stat === stat) m.progress += n;
  }
  checkMissions();
}

function trackRun(stat, value) {
  if (!state || !state.run) return;
  state.run[stat] = value;
  let changed = false;
  for (const m of SAVE.missions) {
    const d = missionDef(m);
    if (d.scope === 'run' && d.stat === stat && !m.fresh && value > m.progress) {
      m.progress = Math.floor(value);
      changed = true;
    }
  }
  if (changed) checkMissions();
}

function checkMissions() {
  for (let i = 0; i < SAVE.missions.length; i++) {
    const m = SAVE.missions[i];
    if (m.progress < m.target) continue;
    const rankBefore = rankIndex();
    SAVE.missionsDone++;
    SAVE.wallet += m.reward;
    if (state && state.doneThisRun) state.doneThisRun.push(`${missionText(m)} (+${m.reward})`);
    UI.toast(`MISIÓN CUMPLIDA +${m.reward}`, missionText(m), 'gold');
    SFX.mission();
    if (rankIndex() > rankBefore) {
      UI.toast(`¡NUEVO RANGO: ${RANKS[rankIndex()].toUpperCase()}!`, `Ahora ganas x${rankMult().toFixed(1)} puntos`, 'leaf');
    }
    SAVE.missions[i] = newMission(SAVE.missions.map(x => x.type));
    persist();
  }
}

// ---------------- Bono diario ----------------
function dayKey(d) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; }

function claimDaily() {
  const today = dayKey(new Date());
  if (SAVE.daily.last === today) return null;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const streak = SAVE.daily.last === dayKey(y) ? SAVE.daily.streak + 1 : 1;
  const reward = 20 * Math.min(streak, 7);
  SAVE.daily = { last: today, streak };
  SAVE.wallet += reward;
  persist();
  return { reward, streak };
}
