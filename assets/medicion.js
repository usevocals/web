/* Vocals · medición de Google Ads con consentimiento (sept. 2026)
   - Modo de consentimiento v2: todo empieza denegado. Sin "Aceptar", Google
     no guarda cookies y solo recibe avisos anónimos de conversión.
   - Banner Aceptar / Rechazar en el idioma de la página (lee <html lang>, que
     cambia al usar el selector de idioma).
   - Conversión "Reserva de llamada": clic en cualquier enlace a cal.com.
   - Cualquier elemento con [data-cookie-prefs] vuelve a abrir el banner. */
(function () {
  var AW = 'AW-18453000788';
  var RESERVA = AW + '/XKm6CJH6wYsdENTkid9E';
  var CLAVE = 'vocals-consent';

  function leer() { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(CLAVE, v); } catch (e) {} }

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function estado(v) {
    return { ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v };
  }
  var elegido = leer();
  var base = estado('denied');
  base.wait_for_update = 500;
  gtag('consent', 'default', base);
  gtag('set', 'ads_data_redaction', true);
  gtag('set', 'url_passthrough', true);
  if (elegido === 'granted') gtag('consent', 'update', estado('granted'));

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + AW;
  document.head.appendChild(s);
  gtag('js', new Date());
  gtag('config', AW);

  // ── Conversión: clic en un enlace de reserva ────────────────────────────
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href*="cal.com/"]') : null;
    if (!a) return;
    window.gtag('event', 'conversion', { send_to: RESERVA, transport_type: 'beacon' });
  }, true);

  // ── Banner ──────────────────────────────────────────────────────────────
  var TXT = {
    en: ['We use Google Ads cookies to measure which ads bring visitors to Vocals, only if you allow it.', 'Accept', 'Reject', 'Privacy', '/privacidad'],
    es: ['Usamos cookies de Google Ads para medir qué anuncios traen visitas a Vocals, solo si lo permites.', 'Aceptar', 'Rechazar', 'Privacidad', '/privacidad'],
    fr: ['Nous utilisons des cookies Google Ads pour mesurer quelles annonces amènent des visiteurs sur Vocals, uniquement avec votre accord.', 'Accepter', 'Refuser', 'Confidentialité', '/fr/confidentialite'],
    de: ['Wir verwenden Cookies von Google Ads, um zu messen, welche Anzeigen Besucher zu Vocals bringen, nur mit Ihrer Zustimmung.', 'Akzeptieren', 'Ablehnen', 'Datenschutz', '/de/datenschutz']
  };
  var caja = null;

  function idioma() {
    var l = (document.documentElement.lang || 'en').slice(0, 2).toLowerCase();
    return TXT[l] ? l : 'en';
  }

  function pintar() {
    if (!caja) return;
    var t = TXT[idioma()];
    caja.querySelector('p').textContent = t[0] + ' ';
    var link = document.createElement('a');
    link.href = t[4]; link.textContent = t[3];
    caja.querySelector('p').appendChild(link);
    caja.querySelector('[data-v="granted"]').textContent = t[1];
    caja.querySelector('[data-v="denied"]').textContent = t[2];
  }

  function estilos() {
    if (document.getElementById('vc-css')) return;
    var st = document.createElement('style');
    st.id = 'vc-css';
    st.textContent =
      '.vc-cookies{position:fixed;left:16px;bottom:16px;z-index:9999;max-width:400px;' +
      'background:#FCFAF7;color:#16130F;border:1px solid rgba(22,19,15,.16);border-radius:14px;' +
      'padding:16px 18px;box-shadow:0 10px 30px rgba(22,19,15,.12);font:14px/1.45 Inter,-apple-system,sans-serif}' +
      '.vc-cookies p{margin:0 0 12px}' +
      '.vc-cookies p a{text-decoration:underline;text-underline-offset:2px;color:inherit}' +
      '.vc-cookies .vc-b{display:flex;gap:8px}' +
      '.vc-cookies button{flex:1;font:600 14px/1 Inter,-apple-system,sans-serif;padding:11px 14px;border-radius:999px;' +
      'border:1px solid #16130F;background:transparent;color:#16130F;cursor:pointer}' +
      '.vc-cookies button:hover{background:#16130F;color:#FCFAF7}' +
      '.vc-cookies button:focus-visible{outline:2px solid #7B6FE0;outline-offset:2px}' +
      '@media (max-width:480px){.vc-cookies{right:16px;max-width:none}}';
    document.head.appendChild(st);
  }

  function abrir() {
    if (caja) return;
    estilos();
    caja = document.createElement('div');
    caja.className = 'vc-cookies';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-live', 'polite');
    caja.setAttribute('aria-label', 'Cookies');
    caja.innerHTML = '<p></p><div class="vc-b"><button type="button" data-v="denied"></button><button type="button" data-v="granted"></button></div>';
    caja.addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-v');
      if (!v) return;
      guardar(v);
      window.gtag('consent', 'update', estado(v));
      caja.remove(); caja = null;
    });
    pintar();
    document.body.appendChild(caja);
  }

  function listo() {
    if (leer() !== 'granted' && leer() !== 'denied') abrir();
    document.addEventListener('click', function (e) {
      var p = e.target && e.target.closest ? e.target.closest('[data-cookie-prefs]') : null;
      if (!p) return;
      e.preventDefault();
      abrir();
    });
    if (window.MutationObserver) {
      new MutationObserver(pintar).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', listo);
  else listo();
})();
