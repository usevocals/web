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
    clinics: 'clinics', clinicas: 'clinics', surveys: 'surveys', encuestas: 'surveys',
    cranes: 'cranes', gruas: 'cranes', mining: 'mining', mineria: 'mining',
    manufacturing: 'manufacturing', produccion: 'manufacturing', hvac: 'hvac', climatizacion: 'hvac'
  };
  // solo estos sectores tienen vídeo en el hero de su landing
  var VIDEO = {
    elevators: '/elevators-video.mp4', vending: '/vending-video.mp4',
    suppliers: '/suppliers-video.mp4', realestate: '/real-estate-video.mp4'
  };
  // la foto de la tarjeta solo "vuela" a la landing si su vídeo está arriba,
  // en el hero (en ascensores el vídeo bajó a la sección de emergencias)
  var MORPH = { vending: 1, suppliers: 1, realestate: 1, cranes: 1, mining: 1, manufacturing: 1, hvac: 1 };
  function slugDe(href) {
    var m = (href || '').match(/\/(elevators|ascensores|ascenseurs|aufzuege|real-estate|inmobiliarias|vending|suppliers|proveedores|clinics|clinicas|surveys|encuestas|cranes|gruas|mining|mineria|manufacturing|produccion|hvac|climatizacion)(?:\/|$)/);
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
    // Con ilustración (no foto) no hay transición al vídeo ni avance al pasar el ratón
    if (card.classList.contains('vi-ilus')) return;
    card.addEventListener('click', function () {
      if (MORPH[s]) media.style.viewTransitionName = 'sec-' + s;
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

/* Home: en móvil las tarjetas (Problema, Para vuestra empresa) pasan solas hacia el costado */
[].forEach.call(document.querySelectorAll('.hp-cards,.hp-gana-cards'),function(row){
  var cards=[].slice.call(row.children), mq=matchMedia('(max-width:640px)');
  var still=matchMedia('(prefers-reduced-motion:reduce)').matches;
  var dots=document.createElement('div'); dots.className='hp-dots';
  cards.forEach(function(c,i){var b=document.createElement('button');b.type='button';
    b.setAttribute('aria-label',(i+1)+' / '+cards.length);
    b.addEventListener('click',function(){go(i);pause();});dots.appendChild(b);});
  row.parentNode.insertBefore(dots,row.nextSibling);
  function cur(){var x=row.scrollLeft,best=0,d=1e9;cards.forEach(function(c,i){var e=Math.abs(c.offsetLeft-row.offsetLeft-22-x);if(e<d){d=e;best=i;}});return best;}
  function mark(){var k=cur();[].forEach.call(dots.children,function(b,i){b.classList.toggle('on',i===k);});}
  function go(i){row.scrollTo({left:cards[i].offsetLeft-row.offsetLeft-22,behavior:'smooth'});}
  var seen=false,hold=0,t=null;
  function pause(){hold=Date.now()+9000;}
  function tick(){if(!mq.matches||!seen||still||Date.now()<hold||document.hidden)return;go((cur()+1)%cards.length);}
  row.addEventListener('scroll',function(){clearTimeout(t);t=setTimeout(mark,80);},{passive:true});
  ['touchstart','pointerdown','wheel'].forEach(function(e){row.addEventListener(e,pause,{passive:true});});
  if('IntersectionObserver' in window) new IntersectionObserver(function(es){seen=es[0].isIntersecting;},{threshold:.5}).observe(row); else seen=true;
  mark(); setInterval(tick,3800);
});

/* Qué lo hace distinto (home): los puntos se despliegan y el ciclo resalta su paso */
(function(){
  var box=document.querySelector('.hp-loop'); if(!box) return;
  var cyc=box.querySelector('.hp-cyc'), items=[].slice.call(box.querySelectorAll('.hp-ai'));
  function open(it){
    items.forEach(function(x){var on=x===it&&!x.classList.contains('open');
      if(x===it){x.classList.toggle('open',on);x.querySelector('.hp-aq').setAttribute('aria-expanded',on?'true':'false');}
      else{x.classList.remove('open');x.querySelector('.hp-aq').setAttribute('aria-expanded','false');}});
    var o=box.querySelector('.hp-ai.open'); cyc.setAttribute('data-on',o?o.getAttribute('data-n'):'0');
  }
  items.forEach(function(it){it.querySelector('.hp-aq').addEventListener('click',function(){open(it);});});
  [].forEach.call(box.querySelectorAll('.hp-node'),function(nd){nd.addEventListener('click',function(){
    var n=nd.getAttribute('data-n'),first=box.querySelector('.hp-ai[data-n="'+n+'"]');
    if(first&&!first.classList.contains('open')) open(first);
    if(first&&matchMedia('(max-width:1000px)').matches) setTimeout(function(){first.scrollIntoView({behavior:'smooth',block:'nearest'});},300);
  });});
})();

/* Industrias (home): cada tarjeta abre un modal con el resumen del sector */
(function(){
  var cards=[].slice.call(document.querySelectorAll('.vgrid .vi')); if(!cards.length||!window.HTMLDialogElement) return;
  // Página en francés o alemán: el texto sale de window.VOCALS_TR (castellano -> idioma de la página)
  var PL=(location.pathname.split('/')[1]||''), TRX=window.VOCALS_TR||{};
  if(PL!=='fr'&&PL!=='de') PL='es';
  function t(es,en){var x=PL==='es'?es:(TRX[es]||es);return '<span data-'+PL+'>'+x+'</span><span data-en>'+en+'</span>';}
  var S={
   ascensores:{tag:t('Ascensores','Elevators'),n:t('Ascensores y mantenimiento','Elevators and maintenance'),
     lead:t('Con el ascensor parado hay vecinos esperando. Vuestro técnico llama desde el hueco o el cuarto de máquinas, dice el código del display y Vocals le guía con los manuales de cada fabricante y cada maniobra.','With the elevator down, residents are waiting. Your technician calls from the shaft or the machine room, reads out the display code, and Vocals guides them with each manufacturer’s and each controller’s manuals.'),
     b:[t('Los códigos de cada fabricante y cada maniobra','Every manufacturer’s and controller’s codes'),t('El historial de cada aparato','Each unit’s history'),t('Fuera de horario, también atiende vuestra línea de emergencias','After hours, it also answers your emergency line')],
     q:t('Fallo de puerta en la planta dos. El display marca E-32.','Door fault on floor two. The display shows E-32.'),
     a:t('E-32 es contacto de puerta. Revisa el enclavamiento de la planta dos.','E-32 is the door contact. Check the floor-two interlock.')},
   vending:{tag:t('Vending','Vending'),n:t('Operadores de vending','Vending operators'),
     lead:t('Una máquina parada es un cliente esperando. Vuestro técnico llama con la máquina delante y Vocals le guía con los manuales de los modelos de vuestro parque.','A machine that’s down is a customer waiting. Your technician calls with the machine in front of them, and Vocals guides them with the manuals for the models in your fleet.'),
     b:[t('Los manuales de cada modelo de vuestro parque','The manuals for every model in your fleet'),t('Lo que saben vuestros técnicos senior, también lo que no está escrito','What your senior technicians know, including what isn’t written down'),t('Para resolver en la visita, sin programar otra','To fix it on the visit, without booking another')],
     q:t('Estoy con la máquina 1047. El agua no calienta.','I’m at machine 1047. The water won’t heat up.'),
     a:t('Mide en el conector JP11. Si llegan 220 V y no calienta, es la resistencia.','Measure at connector JP11. If you get 220 V and it won’t heat, it’s the heating element.')},
   gruas:{tag:t('Grúas','Cranes'),n:t('Grúas y elevación','Cranes and lifting'),
     lead:t('Con la grúa parada, la obra entera espera. Vuestro técnico llama desde la grúa y Vocals le guía con los manuales de vuestra flota, sin buscar un PDF en altura y con guantes.','With the crane down, the whole site waits. Your technician calls from the crane and Vocals guides them with your fleet’s manuals, with no PDF to dig through at height and in gloves.'),
     b:[t('Los manuales de cada modelo de vuestra flota','The manuals for every model in your fleet'),t('Lo que saben vuestros técnicos senior, a una llamada desde obra','Your senior technicians’ know-how, one call away from site'),t('Si la avería toca una seguridad, pasa la llamada a una persona','If the fault involves a safety system, it hands the call to a person')],
     q:t('El limitador me corta la elevación con muy poca carga.','The limiter cuts the hoist with hardly any load.'),
     a:t('Revisa la caja de conexiones del captador de carga: con agua suele dar una lectura falsa.','Check the load sensor junction box: water often gives a false reading.')},
   mineria:{tag:t('Minería','Mining'),n:t('Minería, canteras y áridos','Mining, quarries and aggregates'),
     lead:t('En la cantera el manual no carga, pero una llamada sí. Vuestro técnico llama desde el equipo, sin app ni datos, y Vocals le guía con los manuales de vuestra maquinaria.','At the quarry the manual won’t load, but a call goes through. Your technician calls from the equipment, with no app or data, and Vocals guides them with your machinery’s manuals.'),
     b:[t('Trituradoras, cintas y cribas, cada una con su manual','Crushers, conveyors and screens, each with its manual'),t('Funciona con una llamada normal, sin app','Works on an ordinary phone call, no app'),t('Si la avería toca una seguridad, pasa la llamada a una persona','If the fault involves a safety system, it hands the call to a person')],
     q:t('La cinta principal se para sola a los pocos minutos.','The main conveyor stops by itself after a few minutes.'),
     a:t('Lo más probable es el sensor del tambor de cola. Consigna la cinta antes de tocarlo.','Most likely the tail pulley sensor. Lock out the conveyor before you touch it.')},
   produccion:{tag:t('Producción','Production'),n:t('Líneas de producción','Production lines'),
     lead:t('Una línea parada de madrugada no puede esperar al turno de mañana. El técnico de turno llama desde la máquina y Vocals le guía con los manuales de vuestros equipos, a cualquier hora.','A line that stops in the middle of the night can’t wait for the morning shift. The technician on shift calls from the machine and Vocals guides them with your equipment’s manuals, at any hour.'),
     b:[t('Cada turno tiene a quién llamar','Every shift has someone to call'),t('Responde en vuestro idioma aunque el manual venga en otro','Answers in your language even when the manual is in another'),t('Lo que resuelve cada turno queda registrado','What each shift fixes gets logged')],
     q:t('La envasadora se para con fallo de film. Ya cambié la bobina.','The packer stops on a film fault. I’ve already changed the reel.'),
     a:t('Revisa el freno del portabobinas y ajusta la tensión con la tabla del manual.','Check the reel holder brake and set the tension from the table in the manual.')},
   climatizacion:{tag:t('Climatización','HVAC'),n:t('Climatización y frío industrial','HVAC and industrial refrigeration'),
     lead:t('Una cámara frigorífica parada no espera al lunes. Vuestro técnico dice el código de error y Vocals le guía con los manuales de cada fabricante con el que trabajáis.','A cold room that’s down won’t wait until Monday. Your technician reads out the error code and Vocals guides them with the manuals of every manufacturer you work with.'),
     b:[t('Los códigos de error de cada marca','Every brand’s error codes'),t('También de guardia: noches, fines de semana y picos de verano','On call too: nights, weekends and summer peaks'),t('Para resolver en la primera visita, sin volver con el repuesto','To fix it on the first visit, without coming back with the part')],
     q:t('El compresor arranca y para por alta presión.','The compressor starts and trips on high pressure.'),
     a:t('Limpia la batería y revisa el condensador de arranque del ventilador que no gira.','Clean the coil and check the start capacitor on the fan that isn’t turning.')}
  };
  var d=document.createElement('dialog'); d.className='hp-mdl'; d.setAttribute('aria-label','Sector');
  d.innerHTML='<div class="hp-mdl-card"><button type="button" class="hp-mdl-x" aria-label="Cerrar">&times;</button>'+
    '<div class="hp-mdl-vis"><img alt=""><span class="hp-mdl-tag"></span><div class="hp-mdl-chat"><p class="hp-b hp-bq"><small>'+t('Técnico','Technician')+'</small><span class="q"></span></p><p class="hp-b hp-ba"><small>Vocals</small><span class="a"></span></p></div></div>'+
    '<div class="hp-mdl-body"><h3></h3><p class="hp-mdl-lead"></p><ul></ul><div class="hp-mdl-ctas"><a class="hp-mdl-cal hp-mdl-go" href="javascript:void(0)">'+t('Agendar una llamada','Book a call')+'</a></div>'+
    '<div class="hp-mdl-nav"><button type="button" class="hp-mdl-p" aria-label="Anterior"><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></button><span class="hp-mdl-pos"></span><button type="button" class="hp-mdl-n" aria-label="Siguiente"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button></div></div></div>';
  document.body.appendChild(d);
  var cur=0, q=function(s){return d.querySelector(s);};
  function key(c){var i=c.querySelector('img');return i?i.getAttribute('src').split('?')[0].split('/').pop().replace(/\.\w+$/,''):'';}
  function fill(i){
    cur=(i+cards.length)%cards.length; var c=cards[cur], s=S[key(c)]; if(!s) return;
    q('img').src=c.querySelector('img').getAttribute('src'); q('.hp-mdl-tag').innerHTML=s.tag;
    q('h3').innerHTML=s.n; q('.hp-mdl-lead').innerHTML=s.lead; q('ul').innerHTML=s.b.map(function(x){return '<li>'+x+'</li>';}).join('');
    q('.q').innerHTML=s.q; q('.a').innerHTML=s.a;
    q('.hp-mdl-pos').textContent=(cur+1)+' / '+cards.length;
    [].forEach.call(d.querySelectorAll('.hp-b'),function(b,n){b.classList.remove('on');setTimeout(function(){b.classList.add('on');},250+n*700);});
  }
  cards.forEach(function(c,i){ if(!S[key(c)]) return; c.addEventListener('click',function(e){e.preventDefault();fill(i);d.showModal();}); });
  // El menú "Industrias" de arriba (escritorio y móvil) abre el mismo modal, no las páginas viejas
  [].forEach.call(document.querySelectorAll('#navSectors .navmenu a, #mnav a.msub'),function(a){
    var i=-1; cards.forEach(function(c,n){ if(i<0&&c.getAttribute('href')===a.getAttribute('href')) i=n; });
    if(i<0||!S[key(cards[i])]) return;
    a.addEventListener('click',function(e){ e.preventDefault();
      var nd=document.getElementById('navSectors'); if(nd) nd.classList.remove('open');
      if(typeof closeMnav==='function') closeMnav();
      fill(i); d.showModal(); });
  });
  q('.hp-mdl-x').addEventListener('click',function(){d.close();});
  d.addEventListener('click',function(e){if(e.target===d)d.close();});
  q('.hp-mdl-p').addEventListener('click',function(){fill(cur-1);});
  q('.hp-mdl-n').addEventListener('click',function(){fill(cur+1);});
  d.addEventListener('keydown',function(e){if(e.key==='ArrowRight')fill(cur+1);if(e.key==='ArrowLeft')fill(cur-1);});
  q('.hp-mdl-cal').addEventListener('click',function(){d.close();if(typeof openCal==='function')openCal();});
})();
