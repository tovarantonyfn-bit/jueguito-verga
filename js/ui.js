'use strict';

// ============================================================
//  Interfaz: menús, tienda, misiones, HUD, avisos y controles táctiles
// ============================================================

const UI = (() => {
  const SCREENS = ['menu', 'shop', 'missions', 'over', 'paused'];
  let current = null;
  let shopTab = 'up';
  const leafIcon = '<i class="leaf"></i>';

  function show(id) {
    SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id));
    current = id;
    document.body.classList.toggle('ingame', id === null);
  }
  const hideScreens = () => show(null);
  const setHud = (on) => $('hud').classList.toggle('hidden', !on);

  function walletEls() {
    document.querySelectorAll('.walletN').forEach(el => { el.textContent = SAVE.wallet; });
  }

  // ---------- vista previa del porro ----------
  function previewCanvas(skin, acc, face = 'normal') {
    const c = makeCanvas(PORRO.GW, 19);
    const g = c.getContext('2d');
    drawPorro(g, 0, 19, skin, acc, face, 'stand', 0);
    c.className = 'preview';
    return c;
  }

  // ---------- menú principal ----------
  function menu() {
    show('menu');
    walletEls();
    $('mRank').textContent = RANKS[rankIndex()];
    $('mBest').textContent = SAVE.best;
    $('mBestDist').textContent = SAVE.bestDist;
    const slot = $('mPorro');
    slot.innerHTML = '';
    slot.appendChild(previewCanvas(SAVE.skin, SAVE.acc));
  }

  // ---------- tienda ----------
  function shop(tab = shopTab) {
    shopTab = tab;
    show('shop');
    walletEls();
    document.querySelectorAll('#shop .tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const list = $('shopList');
    list.innerHTML = '';
    if (tab === 'up') {
      for (const u of UPGRADES) {
        const lvl = upg(u.id), max = u.cost.length, cost = u.cost[lvl];
        const card = el('div', 'card');
        card.innerHTML = `
          <div class="card-body">
            <h3>${u.name}</h3>
            <p>${u.desc}</p>
            <div class="pips">${Array.from({ length: max }, (_, i) => `<span class="${i < lvl ? 'on' : ''}"></span>`).join('')}</div>
          </div>`;
        const btn = el('button', 'btn small');
        if (lvl >= max) { btn.textContent = 'MÁXIMO'; btn.disabled = true; }
        else {
          btn.innerHTML = `${leafIcon} ${cost}`;
          if (SAVE.wallet < cost) btn.classList.add('poor');
          btn.addEventListener('click', () => {
            if (SAVE.wallet < cost) { SFX.nope(); toast('TE FALTAN HOJAS', `Necesitas ${cost - SAVE.wallet} más`, 'bad'); return; }
            SAVE.wallet -= cost;
            SAVE.upgrades[u.id] = lvl + 1;
            persist(); SFX.buy();
            shop('up');
          });
        }
        card.appendChild(btn);
        list.appendChild(card);
      }
      return;
    }
    const items = tab === 'skin' ? SKINS : ACCS;
    const owned = tab === 'skin' ? SAVE.skins : SAVE.accs;
    const equipped = tab === 'skin' ? SAVE.skin : SAVE.acc;
    for (const it of items) {
      const card = el('div', 'card item');
      card.appendChild(tab === 'skin' ? previewCanvas(it.id, SAVE.acc) : previewCanvas(SAVE.skin, it.id));
      const body = el('div', 'card-body');
      body.innerHTML = `<h3>${it.name}</h3>`;
      card.appendChild(body);
      const btn = el('button', 'btn small');
      const isOwned = owned.includes(it.id);
      const locked = it.req && !isOwned && !reqMet(it.req);
      if (equipped === it.id) { btn.textContent = 'PUESTO'; btn.disabled = true; card.classList.add('equipped'); }
      else if (isOwned) {
        btn.textContent = 'USAR';
        btn.addEventListener('click', () => { equip(tab, it.id); });
      } else if (locked) {
        btn.textContent = '🔒'; btn.disabled = true;
        body.insertAdjacentHTML('beforeend', `<p class="lock">${it.req.text}</p>`);
      } else {
        btn.innerHTML = `${leafIcon} ${it.price}`;
        if (SAVE.wallet < it.price) btn.classList.add('poor');
        btn.addEventListener('click', () => {
          if (SAVE.wallet < it.price) { SFX.nope(); toast('TE FALTAN HOJAS', `Necesitas ${it.price - SAVE.wallet} más`, 'bad'); return; }
          SAVE.wallet -= it.price;
          owned.push(it.id);
          SFX.buy();
          equip(tab, it.id);
        });
      }
      card.appendChild(btn);
      list.appendChild(card);
    }
  }

  function reqMet(req) {
    if (req.bestDist && SAVE.bestDist < req.bestDist) return false;
    if (req.maxZone && SAVE.maxZone < req.maxZone) return false;
    return true;
  }

  function equip(tab, id) {
    if (tab === 'skin') SAVE.skin = id; else SAVE.acc = id;
    persist();
    shop(tab);
  }

  // ---------- misiones ----------
  function missions() {
    show('missions');
    walletEls();
    const r = rankIndex();
    $('rankName').textContent = RANKS[r];
    $('rankMult').textContent = `x${rankMult().toFixed(1)}`;
    const next = r < RANKS.length - 1 ? `${SAVE.missionsDone % 3}/3 misiones para ser ${RANKS[r + 1]}` : 'Rango máximo. Eres leyenda.';
    $('rankNext').textContent = next;
    const list = $('missionList');
    list.innerHTML = '';
    for (const m of SAVE.missions) {
      const pct = Math.min(100, (m.progress / m.target) * 100);
      const card = el('div', 'card mission');
      card.innerHTML = `
        <div class="card-body">
          <h3>${missionText(m)}</h3>
          <div class="bar"><div style="width:${pct}%"></div></div>
          <p>${Math.min(m.progress, m.target)} / ${m.target}${m.fresh ? ' · cuenta desde la próxima partida' : ''}</p>
        </div>
        <span class="reward">${leafIcon} ${m.reward}</span>`;
      list.appendChild(card);
    }
  }

  // ---------- game over ----------
  function over() {
    const s = state;
    show('over');
    walletEls();
    $('oScore').textContent = s.score;
    $('oDist').textContent = `${Math.floor(s.dist)} m`;
    $('oLeaves').innerHTML = `${leafIcon} ${s.leaves}`;
    $('oZone').textContent = `${s.zone + 1} · ${zoneName(s.zone)}`;
    $('oBest').classList.toggle('hidden', !s.newBest);
    $('oBestVal').textContent = SAVE.best;
    const ml = $('oMissions');
    ml.innerHTML = s.doneThisRun.map(t => `<li>✔ ${t}</li>`).join('');
    ml.classList.toggle('hidden', !s.doneThisRun.length);
    const rb = $('bRevive');
    const cost = reviveCost();
    rb.classList.toggle('hidden', s.revived);
    rb.innerHTML = `REVIVIR · ${leafIcon} ${cost}`;
    rb.classList.toggle('poor', SAVE.wallet < cost);
  }

  // ---------- HUD ----------
  let lastHud = '';
  function hud() {
    const s = state;
    const danger = clamp(1 - (player.x + 2 - s.handPos) / 150, 0, 1);
    const smokeReady = s.smoke >= 100;
    const parts = [];
    if (s.shields) parts.push(`<span class="pw" style="color:${POWERUPS.shield.color}">ESCUDO x${s.shields}</span>`);
    for (const k of ['magnet', 'turbo', 'x2']) {
      if (s.power[k] > 0) parts.push(`<span class="pw" style="color:${POWERUPS[k].color}">${POWERUPS[k].name} ${Math.ceil(s.power[k])}</span>`);
    }
    if (comboMult() > 1) parts.push(`<span class="pw combo">COMBO x${comboMult()}</span>`);
    const key = [Math.floor(s.score), Math.floor(s.dist), s.leaves, Math.round(danger * 50), Math.floor(s.smoke), s.zone, parts.join('')].join('|');
    if (key === lastHud) return;
    lastHud = key;
    $('hScore').textContent = Math.floor(s.score);
    $('hDist').textContent = `${Math.floor(s.dist)} m`;
    $('hLeaves').innerHTML = `${leafIcon} ${s.leaves}`;
    $('hZone').textContent = `ZONA ${s.zone + 1}`;
    const d = $('hDanger');
    d.style.width = `${Math.round(danger * 100)}%`;
    d.style.background = danger > 0.7 ? 'var(--ember)' : danger > 0.4 ? 'var(--gold)' : 'var(--leafc)';
    const sm = $('hSmoke');
    sm.style.width = `${Math.floor(s.smoke)}%`;
    sm.parentElement.parentElement.classList.toggle('ready', smokeReady);
    $('btnSmoke').classList.toggle('ready', smokeReady);
    $('hPower').innerHTML = parts.join('');
  }

  // ---------- avisos ----------
  function toast(title, sub, kind = '') {
    const t = el('div', `toast ${kind}`);
    t.innerHTML = `<b>${title}</b>${sub ? `<span>${sub}</span>` : ''}`;
    $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2700);
  }

  function banner(title, sub) {
    const b = $('banner');
    b.innerHTML = `<b>${title}</b><span>${sub}</span>`;
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  }

  function toggleMute() {
    SAVE.muted = !SAVE.muted;
    persist();
    syncMute();
  }
  function syncMute() {
    $('btnMute').textContent = SAVE.muted ? 'SON OFF' : 'SON ON';
    $('mMute').textContent = SAVE.muted ? 'SONIDO: NO' : 'SONIDO: SÍ';
  }

  // si veníamos del game over, volver al menú reinicia la escena de fondo
  function back() { if (state.mode === 'menu') menu(); else toMenu(); }

  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

  // ---------- controles táctiles ----------
  const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  function initTouch() {
    document.body.classList.toggle('touch', isTouch);
    const pad = $('touch');
    const btns = [...pad.querySelectorAll('[data-k]')];
    const ptrs = new Map();
    const keyAt = (x, y) => {
      const t = document.elementFromPoint(x, y);
      const b = t && t.closest('#touch [data-k]');
      return b ? b.dataset.k : null;
    };
    const sync = () => {
      const held = new Set(ptrs.values());
      for (const b of btns) {
        const k = b.dataset.k, on = held.has(k);
        if (on) pressKey(k); else keys[k] = false;
        b.classList.toggle('on', on);
      }
    };
    pad.addEventListener('pointerdown', (e) => {
      const k = keyAt(e.clientX, e.clientY);
      if (!k) return;
      e.preventDefault();
      initAudio();
      ptrs.set(e.pointerId, k);
      try { pad.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
      sync();
    });
    pad.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      const k = keyAt(e.clientX, e.clientY);
      if (k && k !== ptrs.get(e.pointerId)) { ptrs.set(e.pointerId, k); sync(); }
    });
    const up = (e) => { if (ptrs.delete(e.pointerId)) sync(); };
    pad.addEventListener('pointerup', up);
    pad.addEventListener('pointercancel', up);

    const canFull = document.fullscreenEnabled && document.documentElement.requestFullscreen;
    $('btnFull').classList.toggle('hidden', !canFull);
    $('btnFull').addEventListener('click', () => {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      document.documentElement.requestFullscreen().then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function resize() {
    const portrait = isTouch && innerHeight > innerWidth;
    document.body.classList.toggle('portrait', portrait);
    const availH = portrait ? innerHeight * 0.58 : innerHeight;
    const fit = Math.min(innerWidth / W, availH / H);
    const s = fit >= 2 && !isTouch ? Math.floor(fit) : fit;
    const wrap = $('wrap');
    wrap.style.width = `${W * s}px`;
    wrap.style.height = `${H * s}px`;
    wrap.style.setProperty('--s', s);
  }

  function init() {
    const leafUrl = SPR.leaf.toDataURL();
    document.documentElement.style.setProperty('--leaf-img', `url(${leafUrl})`);
    const on = (id, fn) => $(id).addEventListener('click', () => { initAudio(); fn(); });
    on('bPlay', startRun);
    on('bShop', () => shop());
    on('bMissions', missions);
    on('mMute', toggleMute);
    on('shopBack', back);
    on('missionsBack', back);
    on('bAgain', startRun);
    on('bRevive', revive);
    on('bOverShop', () => shop());
    on('bOverMenu', toMenu);
    on('bResume', togglePause);
    on('bPauseMenu', toMenu);
    on('btnPause', togglePause);
    on('btnMute', toggleMute);
    document.querySelectorAll('#shop .tabs button').forEach(b => b.addEventListener('click', () => shop(b.dataset.tab)));
    syncMute();
    initTouch();
    addEventListener('resize', resize);
    resize();
  }

  return {
    init, show, hideScreens, back, setHud, menu, shop, missions, over, hud, toast, banner, toggleMute,
    get current() { return current; },
  };
})();
