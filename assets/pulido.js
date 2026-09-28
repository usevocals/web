/* Vocals · capa de pulido (auditoría de diseño, sept. 2026)
   Mejora progresiva: si un elemento no existe o el navegador no soporta algo,
   no hace nada y la página funciona igual que antes. */
(function () {
  var fino = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Sectores: slug común para ES/EN/FR/DE ───────────────────────────────
  var SLUG = {
    elevators: 'elevators', ascensores: 'elevators', ascenseurs: 'elevators', aufzuege: 'elevators',
    'real-estate': 'realestate', inmobiliarias: 'realestate',
    vending: 'vending', suppliers: 'suppliers', proveedores: 'suppliers',
    clinics: 'clinics', clinicas: 'clinics', surveys: 'surveys', encuestas: 'surveys'
  };
  // solo estos sectores tienen vídeo en el hero de su landing
  var VIDEO = {
    elevators: '/elevators-video.mp4', vending: '/vending-video.mp4',
    suppliers: '/suppliers-video.mp4', realestate: '/real-estate-video.mp4'
  };
  function slugDe(href) {
    var m = (href || '').match(/\/(elevators|ascensores|ascenseurs|aufzuege|real-estate|inmobiliarias|vending|suppliers|proveedores|clinics|clinicas|surveys|encuestas)(?:\/|$)/);
    return m ? SLUG[m[1]] : null;
  }

  // ── Tarjetas de sector de la home ───────────────────────────────────────
  document.querySelectorAll('a.vi').forEach(function (card) {
    var s = slugDe(card.getAttribute('href'));
    var media = card.querySelector('.media');
    if (!s || !media) return;

    // Transición entre páginas: se nombra la foto en el momento del clic, no
    // antes. Si la nombrásemos siempre, al volver a la home (tarjetas aún sin
    // revelar, opacidad 0) el vídeo "volaría" hacia un hueco invisible.
    card.addEventListener('click', function () {
      if (VIDEO[s]) media.style.viewTransitionName = 'sec-' + s;
    });

    // Avance en vídeo al pasar el ratón: solo con ratón, sin movimiento
    // reducido, y cargando el vídeo la primera vez que hace falta.
    if (!fino || reducido || !VIDEO[s]) return;
    var v = null;
    card.addEventListener('mouseenter', function () {
      if (!v) {
        v = document.createElement('video');
        v.className = 'pv-prev';
        v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none';
        v.setAttribute('aria-hidden', 'true');
        v.src = VIDEO[s];
        var img = media.querySelector('img');
        if (img && img.after) img.after(v); else media.insertBefore(v, media.firstChild);
      }
      var p = v.play(); if (p && p.catch) p.catch(function () {});
      card.classList.add('pv-on');
    });
    card.addEventListener('mouseleave', function () {
      card.classList.remove('pv-on');
      setTimeout(function () { if (v && !card.classList.contains('pv-on')) v.pause(); }, 460);
    });
  });

  // ── Onda del hero que responde a la voz ─────────────────────────────────
  // Cuando suena una llamada de ejemplo (la del hero o las de sector), un
  // analizador mide la energía de la voz y la onda la sigue. La onda lee
  // window.__vozGain en cada fotograma; en reposo vale 0 y no cambia nada.
  if (!document.getElementById('orb') || reducido) return;
  var AC = null, analizador = null, datos = null, raf = 0, activo = null;
  var enganchados = typeof WeakSet === 'function' ? new WeakSet() : null;
  window.__vozGain = 0;

  function medir() {
    var objetivo = 0;
    if (analizador && activo && !activo.paused && !activo.ended) {
      analizador.getByteTimeDomainData(datos);
      var s = 0;
      for (var i = 0; i < datos.length; i++) { var d = (datos[i] - 128) / 128; s += d * d; }
      objetivo = Math.min(1, Math.sqrt(s / datos.length) * 4.2);
    }
    // sube rápido con la voz, baja despacio: se lee como respiración, no como parpadeo
    var k = objetivo > window.__vozGain ? 0.35 : 0.08;
    window.__vozGain += (objetivo - window.__vozGain) * k;
    // el bucle vive mientras suena el audio (al arrancar hay unos fotogramas en
    // silencio: pararlo ahí lo apagaba antes de la primera palabra)
    var sonando = activo && !activo.paused && !activo.ended;
    if (!sonando && window.__vozGain < 0.004) { window.__vozGain = 0; raf = 0; return; }
    raf = requestAnimationFrame(medir);
  }

  function enganchar(el) {
    var src = el.currentSrc || el.src || '';
    if (!/\/(call-(es|en)|uc-[\w-]+)\.mp3(\?|$)/.test(src)) return false;
    if (enganchados && enganchados.has(el)) return true;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      if (!analizador) {
        analizador = AC.createAnalyser();
        analizador.fftSize = 1024;
        datos = new Uint8Array(analizador.fftSize);
        analizador.connect(AC.destination);   // sin esto la llamada sonaría muda
      }
      AC.createMediaElementSource(el).connect(analizador);
      if (enganchados) enganchados.add(el);
      return true;
    } catch (e) { return false; }
  }

  var playOriginal = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (this instanceof HTMLAudioElement && enganchar(this)) {
      activo = this;
      if (!raf) raf = requestAnimationFrame(medir);
    }
    return playOriginal.apply(this, arguments);
  };
})();
