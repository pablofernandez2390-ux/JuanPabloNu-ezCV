// Asistente del CV: responde SOLO con los datos del CV (window.__cvActual). No usa IA ni inventa nada.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function lista(x) {
    if (!x) return [];
    var a = Array.isArray(x) ? x : Object.keys(x).map(function (k) { return x[k]; });
    return a.filter(function (v) { return v !== undefined && v !== null && v !== ''; });
  }
  function datos() { return window.__cvActual || window.CV_DEFAULT || {}; }
  function quien(d) { return String(d.nombre || 'Juan Pablo').split(/\s+/).slice(0, 2).join(' '); }

  var STOP = 'para como cual cuales tiene tenes tienes sabe sabes hace hacer esta estas estan sobre algun alguna donde cuando quien puede podes usted ella esto esos esas pero porque tambien muy mas menos'.split(' ');

  function lineasExperiencia(d) {
    return lista(d.experiencia).map(function (e) {
      return (e.empresa || '') + (e.periodo ? ' (' + e.periodo + ')' : '') + (e.detalle ? ': ' + e.detalle : '');
    });
  }
  function todasLasLineas(d) {
    var L = [];
    if (d.perfil) L.push(d.perfil);
    L = L.concat(lineasExperiencia(d), lista(d.tareas), lista(d.formacion), lista(d.habilidades), lista(d.documentacion));
    if (d.resumenExp) L.push(d.resumenExp);
    if (d.disponibilidad) L.push(d.disponibilidad);
    return L;
  }

  var INTENCIONES = [
    { re: /\b(ci|cedula|direccion|domicilio|calle|documento de identidad)\b/, f: function (d) {
        return { intro: 'Los datos personales (cédula y dirección) los entrega ' + quien(d) + ' una vez que es seleccionado. Podés pedirlos por WhatsApp.', wa: true }; } },
    { re: /(sueldo|salario|pretension|cuanto cobra|cobrar|remuneracion)/, f: function (d) {
        return { intro: 'El CV no indica pretensión salarial. Eso lo conversan directamente con ' + quien(d) + '.', wa: true }; } },
    { re: /^(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|hey|que tal)/, f: function (d) {
        return { intro: '¡Hola! Soy el asistente del CV de ' + quien(d) + '. Respondo solo con lo que dice su CV. Elegí una pregunta o escribí la tuya.' }; } },
    { re: /(contact|whatsapp|wasap|telefono|celular|numero|llamar|escribir|hablar|comunicar)/, f: function (d) {
        return { intro: 'Podés escribirle a ' + quien(d) + ' directamente por WhatsApp:', wa: true }; } },
    { re: /(quien es|quien sos|presenta|perfil|resumen|cuentame|contame|de que se trata)/, f: function (d) {
        return d.perfil ? { intro: d.perfil } : null; } },
    { re: /(montacarga|autoelevador|elevador|apilador)/, f: function (d) { return buscar(d, ['montacarga']); } },
    { re: /(experiencia|trabaj|empresa|empleo|anteriores|antecedente|historial|historia laboral|bps)/, f: function (d) {
        var it = lineasExperiencia(d);
        if (d.resumenExp) it.push(d.resumenExp);
        if (d.notaBps) it.push(d.notaBps);
        return it.length ? { intro: 'Experiencia laboral de ' + quien(d) + ':', items: it } : null; } },
    { re: /(tarea|funcion|que hace|que sabe hacer|puede hacer|sabes hacer|responsabilidad)/, f: function (d) {
        var it = lista(d.tareas);
        return it.length ? { intro: 'Tareas que ha desempeñado:', items: it } : null; } },
    { re: /(formacion|curso|estudio|capacitacion|titulo|educacion)/, f: function (d) {
        var it = lista(d.formacion);
        return it.length ? { intro: 'Formación:', items: it } : null; } },
    { re: /(habilidad|aptitud|fortaleza|cualidad|competencia|destreza)/, f: function (d) {
        var it = lista(d.habilidades);
        return it.length ? { intro: 'Habilidades:', items: it } : null; } },
    { re: /(disponib|horario|turno|part time|full time|tiempo completo|medio tiempo|empezar|incorporar|fin de semana|fines de semana)/, f: function (d) {
        return d.disponibilidad ? { intro: d.disponibilidad } : null; } },
    { re: /(carnet|carne|libreta|manipul|document|habilitacion|licencia|salud)/, f: function (d) {
        var it = lista(d.documentacion);
        return it.length ? { intro: 'Documentación:', items: it } : null; } },
    { re: /(edad|anos tiene|cuantos anos)/, f: function (d) {
        return d.edad ? { intro: quien(d) + ' tiene ' + d.edad + '.' } : null; } },
    { re: /(ciudad|vive|zona|durazno|ubicacion|reside|donde esta)/, f: function (d) {
        return d.ciudad ? { intro: 'Ciudad: ' + d.ciudad + '.' } : null; } }
  ];

  function buscar(d, raices) {
    var enc = todasLasLineas(d).filter(function (l) {
      var n = norm(l);
      return raices.some(function (r) { return n.indexOf(r) !== -1; });
    });
    return enc.length ? { intro: 'Esto dice el CV sobre ese tema:', items: enc.slice(0, 5) } : null;
  }

  function responder(pregunta) {
    var d = datos();
    var q = norm(pregunta).trim();
    for (var i = 0; i < INTENCIONES.length; i++) {
      if (INTENCIONES[i].re.test(q)) {
        var r = INTENCIONES[i].f(d);
        if (r) return r;
      }
    }
    var raices = q.split(/[^a-z0-9ñ]+/).filter(function (w) { return w.length >= 4 && STOP.indexOf(w) === -1; })
      .map(function (w) { return w.slice(0, 5); });
    if (raices.length) {
      var b = buscar(d, raices);
      if (b) return b;
    }
    return { intro: 'Ese dato no figura en el CV, así que prefiero no inventarlo. Podés preguntárselo directamente a ' + quien(d) + ':', wa: true };
  }

  // ---------- Interfaz ----------
  var css = document.createElement('style');
  css.textContent =
    '#botBtn{position:fixed;right:16px;bottom:16px;z-index:50;background:var(--lateral,#1f3a4d);color:#fff;border:2px solid #fff;border-radius:28px;padding:12px 18px;font:bold 15px Arial,sans-serif;box-shadow:0 3px 10px rgba(0,0,0,.35);cursor:pointer}' +
    '#botBox{position:fixed;right:16px;bottom:16px;z-index:51;width:360px;max-width:calc(100vw - 24px);height:520px;max-height:calc(100vh - 24px);background:#fff;border-radius:14px;box-shadow:0 4px 18px rgba(0,0,0,.4);display:flex;flex-direction:column;overflow:hidden;font-family:Arial,sans-serif}' +
    '#botBox[hidden]{display:none}' +
    '#botHead{background:var(--lateral,#1f3a4d);color:#fff;padding:10px 12px;display:flex;align-items:center;gap:8px;font-weight:bold;font-size:15px}' +
    '#botHead span{flex:1}' +
    '#botHead button{background:transparent;color:#fff;border:0;font-size:20px;cursor:pointer;padding:2px 6px}' +
    '#botLog{flex:1;overflow-y:auto;padding:10px;background:#eef1f4;font-size:14px;line-height:1.4;color:#222}' +
    '.bm{max-width:88%;padding:8px 10px;border-radius:10px;margin-bottom:8px;word-wrap:break-word}' +
    '.bm.yo{background:var(--lateral,#1f3a4d);color:#fff;margin-left:auto}' +
    '.bm.bot{background:#fff;border:1px solid #d5dbe0}' +
    '.bm ul{margin:6px 0 0;padding-left:18px}.bm li{margin-bottom:4px}' +
    '.bm a.wa2{display:block;background:#25d366;color:#fff;text-decoration:none;font-weight:bold;text-align:center;padding:9px;border-radius:6px;margin-top:8px}' +
    '#botSug{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px 0;background:#eef1f4}' +
    '#botSug button{background:#fff;border:1px solid var(--lateral,#1f3a4d);color:var(--lateral,#1f3a4d);border-radius:14px;padding:5px 10px;font-size:13px;cursor:pointer;font-family:inherit}' +
    '#botForm{display:flex;gap:6px;padding:8px;background:#eef1f4;border-top:1px solid #d5dbe0}' +
    '#botIn{flex:1;font-size:16px;padding:8px;border:1px solid #bbb;border-radius:8px;min-width:0;font-family:inherit}' +
    '#botForm button{border:0;border-radius:8px;padding:0 12px;font-size:18px;cursor:pointer;background:var(--lateral,#1f3a4d);color:#fff}' +
    '#botForm button.esc{background:#c0392b}' +
    '#botAviso{font-size:11px;color:#667;text-align:center;padding:0 8px 6px;background:#eef1f4}' +
    '@media print{#botBtn,#botBox{display:none!important}}';
  document.head.appendChild(css);

  function el(tag, props, hijos) {
    var e = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) { e[k] = props[k]; });
    (hijos || []).forEach(function (h) { e.appendChild(h); });
    return e;
  }

  var btn = el('button', { id: 'botBtn', type: 'button', textContent: '💬 Preguntale al CV' });
  var log = el('div', { id: 'botLog' });
  var sug = el('div', { id: 'botSug' });
  var inp = el('input', { id: 'botIn', type: 'text', placeholder: 'Escribí tu pregunta…', autocomplete: 'off' });
  var enviar = el('button', { type: 'submit', textContent: '➤', title: 'Enviar' });
  var form = el('form', { id: 'botForm' }, [inp]);
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var mic = null;
  if (SR) { mic = el('button', { type: 'button', textContent: '🎤', title: 'Hablar' }); form.appendChild(mic); }
  form.appendChild(enviar);
  var vozOn = false;
  var bVoz = el('button', { type: 'button', textContent: '🔇', title: 'Leer respuestas en voz alta' });
  var bCerrar = el('button', { type: 'button', textContent: '✕', title: 'Cerrar' });
  var head = el('div', { id: 'botHead' }, [el('span', { textContent: 'Asistente del CV' })]);
  if (window.speechSynthesis) head.appendChild(bVoz);
  head.appendChild(bCerrar);
  var aviso = el('div', { id: 'botAviso', textContent: 'Respuestas automáticas, tomadas solo del CV.' });
  var box = el('div', { id: 'botBox', hidden: true }, [head, log, sug, form, aviso]);
  document.body.appendChild(btn);
  document.body.appendChild(box);

  function mensajeYo(t) { log.appendChild(el('div', { className: 'bm yo', textContent: t })); log.scrollTop = log.scrollHeight; }
  function mensajeBot(r) {
    var d = datos();
    var m = el('div', { className: 'bm bot' });
    m.appendChild(el('div', { textContent: r.intro }));
    if (r.items && r.items.length) {
      var u = el('ul');
      r.items.forEach(function (t) { u.appendChild(el('li', { textContent: t })); });
      m.appendChild(u);
    }
    var num = String(d.whatsapp || '').replace(/\D/g, '');
    if (r.wa && num) {
      var a = el('a', { className: 'wa2', textContent: d.textoBoton || 'Escribirme por WhatsApp' });
      a.href = 'https://wa.me/' + num + '?text=' + encodeURIComponent(d.mensajeWa || '');
      m.appendChild(a);
    }
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return [r.intro].concat(r.items || []).join('. ');
  }
  function hablar(texto) {
    if (!vozOn || !window.speechSynthesis) return;
    try {
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(texto);
      u.lang = 'es-UY';
      var vs = speechSynthesis.getVoices().filter(function (v) { return /^es/i.test(v.lang); });
      if (vs.length) u.voice = vs.filter(function (v) { return /UY|AR|419|MX|US/i.test(v.lang); })[0] || vs[0];
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  function preguntar(t) {
    t = String(t || '').trim();
    if (!t) return;
    mensajeYo(t);
    hablar(mensajeBot(responder(t)));
  }

  function sugerencias() {
    sug.textContent = '';
    ['¿Qué experiencia tiene?', '¿Sabe usar montacargas?', '¿Qué disponibilidad tiene?', '¿Qué cursos y carnets tiene?', '¿Cómo lo contacto?'].forEach(function (q) {
      sug.appendChild(el('button', { type: 'button', textContent: q, onclick: function () { preguntar(q); } }));
    });
  }

  var abierto = false;
  function abrir() {
    box.hidden = false; btn.hidden = true;
    if (!abierto) {
      abierto = true;
      sugerencias();
      mensajeBot(responder('hola'));
    }
  }
  btn.onclick = abrir;
  bCerrar.onclick = function () { box.hidden = true; btn.hidden = false; if (window.speechSynthesis) speechSynthesis.cancel(); };
  bVoz.onclick = function () {
    vozOn = !vozOn;
    bVoz.textContent = vozOn ? '🔊' : '🔇';
    if (!vozOn && window.speechSynthesis) speechSynthesis.cancel();
  };
  form.onsubmit = function (ev) { ev.preventDefault(); var t = inp.value; inp.value = ''; preguntar(t); };

  if (mic) {
    var rec = null;
    mic.onclick = function () {
      if (rec) { try { rec.stop(); } catch (e) {} return; }
      try {
        rec = new SR();
        rec.lang = 'es-UY';
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.onresult = function (ev) {
          var t = ev.results[0][0].transcript;
          vozOn = !!window.speechSynthesis; // si preguntás hablando, responde hablando
          bVoz.textContent = vozOn ? '🔊' : '🔇';
          preguntar(t);
        };
        rec.onerror = function () { mensajeBot({ intro: 'No pude usar el micrófono. Revisá el permiso del navegador o escribí la pregunta.' }); };
        rec.onend = function () { rec = null; mic.className = ''; mic.textContent = '🎤'; };
        mic.className = 'esc'; mic.textContent = '⏹';
        rec.start();
      } catch (e) { rec = null; }
    };
  }
})();
