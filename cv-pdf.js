// Genera el PDF del CV (con texto seleccionable) a partir de los datos.
// Necesita que antes esté cargado jspdf.umd.min.js.
(function () {
  function rgb(hex) {
    var h = String(hex || '#1f3a4d').replace('#', '');
    if (h.length === 3) h = h.replace(/(.)/g, '$1$1');
    var n = parseInt(h, 16);
    if (isNaN(n)) n = 0x1f3a4d;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // t: 0 = el color tal cual, 1 = blanco
  function aclarar(c, t) {
    return c.map(function (v) { return Math.round(v + (255 - v) * t); });
  }
  function lista(x) {
    if (!x) return [];
    var a = Array.isArray(x) ? x : Object.keys(x).map(function (k) { return x[k]; });
    return a.filter(function (v) { return v !== undefined && v !== null && v !== ''; });
  }
  function formatoNumero(dig) {
    if (/^598\d{8}$/.test(dig)) return '+598 ' + dig.slice(3, 5) + ' ' + dig.slice(5, 8) + ' ' + dig.slice(8);
    return '+' + dig;
  }
  function fotoCircular(dataUrl, px) {
    return new Promise(function (ok) {
      if (!dataUrl) return ok(null);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas');
        c.width = c.height = px;
        var g = c.getContext('2d');
        var anillo = Math.round(px * 0.035);
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2); g.fill();
        g.save();
        g.beginPath(); g.arc(px / 2, px / 2, px / 2 - anillo, 0, Math.PI * 2); g.clip();
        var lado = Math.min(img.width, img.height);
        g.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, anillo, anillo, px - 2 * anillo, px - 2 * anillo);
        g.restore();
        ok(c.toDataURL('image/png'));
      };
      img.onerror = function () { ok(null); };
      img.src = dataUrl;
    });
  }

  window.generarPDF = async function (d) {
    d = d || {};
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    var PW = 210, PH = 297, SW = 70;
    var tema = d.tema || {};
    var cLat = rgb(tema.colorLateral);
    var cTit = rgb(tema.colorTitulos);
    var cLinea = aclarar(cLat, 0.55);
    var cEtiq = aclarar(cLat, 0.7);
    var fam = /times|georgia/i.test(tema.fuente || '') ? 'times' : 'helvetica';
    var nombre = d.nombre || 'CV';
    doc.setProperties({ title: 'CV - ' + nombre, author: nombre });

    function fondoLateral() {
      doc.setFillColor(cLat[0], cLat[1], cLat[2]);
      doc.rect(0, 0, SW, PH, 'F');
    }
    fondoLateral();

    // ---------- Columna lateral (primera página) ----------
    var sx = 8, sw = SW - 16, sy = 22;
    var fotoPng = await fotoCircular(d.foto, 400);
    if (fotoPng) {
      var dia = 40;
      doc.addImage(fotoPng, 'PNG', (SW - dia) / 2, 16, dia, dia);
      sy = 16 + dia + 7;
    }
    function ladoTitulo(t) {
      sy += 3;
      doc.setFont(fam, 'bold'); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
      doc.setCharSpace(0.7); doc.text(t.toUpperCase(), sx, sy); doc.setCharSpace(0);
      sy += 1.8;
      doc.setDrawColor(cLinea[0], cLinea[1], cLinea[2]); doc.setLineWidth(0.3);
      doc.line(sx, sy, sx + sw, sy);
      sy += 5.5;
    }
    function ladoTexto(t, size, estilo) {
      doc.setFont(fam, estilo || 'normal'); doc.setFontSize(size); doc.setTextColor(255, 255, 255);
      var ls = doc.splitTextToSize(t, sw);
      ls.forEach(function (l) { doc.text(l, sx, sy); sy += 4.4; });
    }
    function ladoEtiqueta(et, valor) {
      doc.setFont(fam, 'normal'); doc.setFontSize(7); doc.setTextColor(cEtiq[0], cEtiq[1], cEtiq[2]);
      doc.text(et.toUpperCase(), sx, sy); sy += 4;
      ladoTexto(valor, 9.5);
      sy += 1.5;
    }

    var numero = String(d.whatsapp || '').replace(/\D/g, '');
    if (d.ciudad || numero) {
      ladoTitulo('Contacto');
      if (d.ciudad) ladoEtiqueta('Ciudad', d.ciudad);
      if (numero) {
        var url = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(d.mensajeWa || '');
        var bt = d.textoBoton || 'Escribirme por WhatsApp';
        doc.setFillColor(37, 211, 102);
        doc.roundedRect(sx, sy, sw, 9, 1.8, 1.8, 'F');
        doc.setFont(fam, 'bold'); doc.setTextColor(255, 255, 255);
        var fs = 9; doc.setFontSize(fs);
        while (doc.getTextWidth(bt) > sw - 4 && fs > 5) { fs -= 0.5; doc.setFontSize(fs); }
        doc.text(bt, sx + sw / 2, sy + 5.8, { align: 'center' });
        doc.link(sx, sy, sw, 9, { url: url });
        sy += 14;
        if (d.pdfNumero !== false) {
          doc.setFont(fam, 'normal'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
          doc.textWithLink('WhatsApp: ' + formatoNumero(numero), sx, sy, { url: url });
          sy += 6;
        }
      }
    }
    if (d.edad) {
      ladoTitulo('Datos personales');
      ladoEtiqueta('Edad', d.edad);
    }
    var docs = lista(d.documentacion);
    if (docs.length) {
      ladoTitulo('Documentación');
      docs.forEach(function (t) { ladoTexto(t, 9.5); sy += 1.8; });
    }

    // ---------- Columna principal ----------
    var mx = SW + 13, mw = PW - mx - 14;
    var TOP = 16, BOT = PH - 10, y = 16;
    var gris = [34, 34, 34];

    function pagina() { doc.addPage(); fondoLateral(); y = TOP; }
    function asegurar(h) { if (y + h > BOT) pagina(); }
    function fuente(size, estilo, color) {
      doc.setFont(fam, estilo || 'normal'); doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
    }
    function parrafo(t, size, color, lh, estilo) {
      fuente(size, estilo, color);
      doc.splitTextToSize(t, mw).forEach(function (l) {
        asegurar(lh); y += lh; doc.text(l, mx, y);
      });
    }
    function titulo(t) {
      asegurar(22);
      y += 6.5;
      fuente(10, 'bold', cTit);
      doc.setCharSpace(0.8); doc.text(t.toUpperCase(), mx, y); doc.setCharSpace(0);
      y += 1.8;
      doc.setDrawColor(cTit[0], cTit[1], cTit[2]); doc.setLineWidth(0.5);
      doc.line(mx, y, mx + mw, y);
      y += 2.8;
    }
    function vinetas(items) {
      items.forEach(function (it) {
        fuente(10, 'normal', gris);
        var ls = doc.splitTextToSize(it, mw - 6);
        asegurar(ls.length * 4.7 + 1.5);
        ls.forEach(function (l, i) {
          y += 4.7;
          if (i === 0) { doc.setFillColor(70, 70, 70); doc.circle(mx + 1.3, y - 1.2, 0.55, 'F'); }
          doc.text(l, mx + 5, y);
        });
        y += 1.4;
      });
    }

    fuente(22, 'bold', cTit);
    doc.splitTextToSize(nombre, mw).forEach(function (l) { y += 9.5; doc.text(l, mx, y); });
    if (d.subtitulo) { y += 1; parrafo(d.subtitulo, 10.5, [90, 107, 120], 5.4); y += 1; }

    if (d.perfil) { titulo('Perfil'); parrafo(d.perfil, 10, gris, 4.7); }

    var exps = lista(d.experiencia);
    var tareas = lista(d.tareas);
    if (exps.length || tareas.length || d.resumenExp || d.notaBps) {
      titulo('Experiencia laboral');
      exps.forEach(function (e) {
        fuente(10, 'normal', gris);
        var nom = e.empresa || '', per = e.periodo ? ' · ' + e.periodo : '';
        var det = e.detalle ? doc.splitTextToSize(e.detalle, mw) : [];
        asegurar(5 + det.length * 4.7 + 2.5);
        y += 4.7;
        doc.setFont(fam, 'bold'); doc.text(nom, mx, y);
        var w = doc.getTextWidth(nom);
        doc.setFont(fam, 'normal'); doc.text(per, mx + w, y);
        det.forEach(function (l) { y += 4.7; doc.text(l, mx, y); });
        y += 2.6;
      });
      if (tareas.length) {
        asegurar(14);
        fuente(10, 'bold', gris); y += 4.7; doc.text('Tareas desempeñadas:', mx, y); y += 1.2;
        vinetas(tareas);
      }
      if (d.resumenExp) { y += 1.5; parrafo(d.resumenExp, 10, gris, 4.7); y += 1; }
      if (d.notaBps) { y += 1.5; parrafo(d.notaBps, 9.5, [80, 80, 80], 4.7, 'italic'); }
    }

    var form = lista(d.formacion);
    if (form.length) { titulo('Formación'); vinetas(form); }
    var habs = lista(d.habilidades);
    if (habs.length) { titulo('Habilidades'); vinetas(habs); }
    if (d.disponibilidad) { titulo('Disponibilidad'); parrafo(d.disponibilidad, 10, gris, 4.7); }

    var archivo = 'CV-' + nombre.replace(/\s+/g, '-') + '.pdf';
    var url = URL.createObjectURL(doc.output('blob'));
    var a = document.createElement('a');
    a.href = url; a.download = archivo;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
  };
})();
