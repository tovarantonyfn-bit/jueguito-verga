'use strict';

// ============================================================
//  App instalable: funciona sin internet y se puede poner en el inicio
// ============================================================

(() => {
  const online = location.protocol.startsWith('http');
  const embedded = window.self !== window.top;
  if (online && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  const btn = $('bInstall');
  let deferred = null;
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    btn.classList.remove('hidden');
  });
  btn.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    deferred = null;
    btn.classList.add('hidden');
  });
  addEventListener('appinstalled', () => {
    btn.classList.add('hidden');
    UI.toast('¡APP INSTALADA!', 'Búscala en tu pantalla de inicio', 'leaf');
  });

  // iPhone no tiene botón de instalar: se hace desde Compartir
  const standalone = matchMedia('(display-mode: standalone)').matches
    || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && online && !embedded && !standalone) $('iosHint').classList.remove('hidden');
})();
