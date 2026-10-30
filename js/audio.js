'use strict';

// ============================================================
//  Sonidos sintetizados (sin archivos)
// ============================================================

let actx = null;

function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
}

function beep(freq, dur, type = 'square', vol = 0.06, slide = 0, delay = 0) {
  if (!actx || SAVE.muted) return;
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

function noise(dur, vol = 0.08, delay = 0, filterFreq = 900) {
  if (!actx || SAVE.muted) return;
  const t = actx.currentTime + delay;
  const len = Math.floor(actx.sampleRate * dur);
  const buf = actx.createBuffer(1, len, actx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = actx.createBufferSource(); src.buffer = buf;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
  const g = actx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(actx.destination);
  src.start(t);
}

const arp = (notes, step = 0.07, type = 'square', vol = 0.05) =>
  notes.forEach((n, i) => beep(n, step * 1.6, type, vol, 0, i * step));

const SFX = {
  jump: () => beep(330, 0.12, 'square', 0.05, 300),
  jump2: () => beep(440, 0.12, 'square', 0.05, 400),
  leaf: () => { beep(880, 0.06, 'square', 0.035); beep(1320, 0.08, 'square', 0.035, 0, 0.05); },
  drop: () => { beep(600, 0.1, 'triangle', 0.08, 500); beep(900, 0.15, 'triangle', 0.06, 600, 0.08); },
  hit: () => { beep(160, 0.25, 'sawtooth', 0.08, -100); noise(0.15, 0.06); },
  stomp: () => { beep(220, 0.08, 'square', 0.07, 400); noise(0.08, 0.05, 0, 2000); },
  warn: () => beep(220, 0.08, 'square', 0.04),
  swoop: () => beep(500, 0.2, 'sawtooth', 0.06, -400),
  smoke: () => { noise(0.6, 0.12, 0, 600); beep(180, 0.4, 'sawtooth', 0.04, -100); },
  cough: () => { noise(0.12, 0.08, 0, 1200); noise(0.12, 0.07, 0.18, 1000); },
  power: () => arp([523, 659, 784, 1047], 0.06),
  shield: () => { beep(1200, 0.2, 'triangle', 0.07, -800); noise(0.2, 0.05, 0, 3000); },
  zone: () => arp([392, 523, 659, 784, 1047], 0.09, 'square', 0.06),
  mission: () => arp([784, 988, 1175, 1568], 0.08, 'triangle', 0.08),
  buy: () => arp([660, 990], 0.06, 'square', 0.05),
  nope: () => beep(140, 0.15, 'square', 0.05),
  caught: () => { beep(300, 0.2, 'square', 0.07, -150); beep(200, 0.4, 'square', 0.07, -120, 0.2); },
  flick: () => beep(1800, 0.05, 'square', 0.04, -1200),
  inhale: () => { noise(1.0, 0.05, 0, 500); beep(120, 1.0, 'sawtooth', 0.02, 60); },
};
