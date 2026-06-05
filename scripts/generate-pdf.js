#!/usr/bin/env node
'use strict';
/**
 * Genera docs/reglas-polla-mundial.pdf sin dependencias externas.
 * Uso: node scripts/generate-pdf.js
 */
const fs   = require('fs');
const path = require('path');

// ── Constantes de página A4 ──────────────────────────────────────────────────
const PW = 595.28, PH = 841.89;
const ML = 55, MT = 50, MB = 50;
const CW = PW - ML * 2;

// ── Encoding WinAnsiEncoding (Latin-1 para español) ─────────────────────────
function enc(s) {
  return String(s)
    .replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')
    .replace(/á/g,'\\341').replace(/Á/g,'\\301')
    .replace(/é/g,'\\351').replace(/É/g,'\\311')
    .replace(/í/g,'\\355').replace(/Í/g,'\\315')
    .replace(/ó/g,'\\363').replace(/Ó/g,'\\323')
    .replace(/ú/g,'\\372').replace(/Ú/g,'\\332')
    .replace(/ñ/g,'\\361').replace(/Ñ/g,'\\321')
    .replace(/ü/g,'\\374').replace(/Ü/g,'\\334')
    .replace(/¿/g,'\\277').replace(/¡/g,'\\241')
    .replace(/·/g,'\\267').replace(/–/g,'-').replace(/—/g,'-')
    .replace(/[^\x00-\xFF]/g,'');
}

// Ancho estimado de texto (Helvetica ≈ 0.52 × size × chars)
function sw(s, fs) { return s.length * fs * 0.52; }

// Ajuste de texto al ancho máximo
function wrap(txt, fs, maxW) {
  const words = txt.split(' '), lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (sw(t, fs) > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [''];
}

// ── Bloques de contenido ─────────────────────────────────────────────────────
const CONTENT = [
  { t:'title',   s:'POLLA MUNDIALISTA 2026' },
  { t:'center',  s:'EEUU · México · Canadá 2026', fs:12, font:'F3' },
  { t:'center',  s:'Reglas del juego y cómo participar — mundial.infrony.app', fs:10, font:'F3' },
  { t:'space',   h:14 },
  { t:'rule' },

  { t:'heading', s:'¿QUÉ ES LA POLLA MUNDIALISTA?' },
  { t:'body',    s:'La Polla Mundialista es un juego de pronósticos del Mundial de Fútbol 2026. Cada participante predice resultados de partidos y clasificaciones; quien más aciertos acumule al final, gana el pozo.' },
  { t:'body',    s:'Hay dos fases independientes: Fase de Grupos ($5) y Fase Eliminatoria ($10).' },
  { t:'space',   h:6 },
  { t:'rule' },

  { t:'heading', s:'FASE DE GRUPOS — $5' },
  { t:'subhead', s:'¿Qué debes pronosticar?' },
  { t:'bullet',  s:'Resultado de cada partido (72 partidos): 1 = gana local, X = empate, 2 = gana visitante.' },
  { t:'bullet',  s:'Clasificados por grupo (12 grupos, A–L): selecciona el 1° y 2° clasificado de cada grupo.' },
  { t:'space',   h:4 },
  { t:'subhead', s:'Puntuación — Fase de Grupos' },
  { t:'bullet',  s:'Resultado correcto de partido: 1 punto' },
  { t:'bullet',  s:'1° clasificado de grupo correcto: 2 puntos' },
  { t:'bullet',  s:'2° clasificado de grupo correcto: 1 punto' },
  { t:'bullet',  s:'Puntaje máximo posible: 108 puntos (72 partidos + 24 primeros + 12 segundos)' },
  { t:'space',   h:4 },
  { t:'subhead', s:'Reglas de la Fase de Grupos' },
  { t:'bullet',  s:'Los picks se guardan automáticamente al hacer clic.' },
  { t:'bullet',  s:'Puedes cambiar tu pronóstico antes de la fecha límite del grupo.' },
  { t:'bullet',  s:'Los picks se bloquean automáticamente al inicio del primer partido de cada grupo.' },
  { t:'bullet',  s:'Picks bloqueados no pueden modificarse bajo ninguna circunstancia.' },
  { t:'space',   h:6 },
  { t:'rule' },

  { t:'heading', s:'FASE ELIMINATORIA — $10' },
  { t:'subhead', s:'¿Qué debes pronosticar?' },
  { t:'body',    s:'Para cada partido de la fase eliminatoria, selecciona el equipo que crees que ganará (tiempo regular, prórroga o penales).' },
  { t:'space',   h:4 },
  { t:'subhead', s:'Puntuación — Fase Eliminatoria' },
  { t:'bullet',  s:'Dieciseisavos de Final (16 partidos): 1 punto por acierto — máx 16 pts' },
  { t:'bullet',  s:'Octavos de Final (8 partidos): 2 puntos por acierto — máx 16 pts' },
  { t:'bullet',  s:'Cuartos de Final (4 partidos): 4 puntos por acierto — máx 16 pts' },
  { t:'bullet',  s:'Semifinal (2 partidos): 6 puntos por acierto — máx 12 pts' },
  { t:'bullet',  s:'Tercer Lugar y Gran Final (2 partidos): 8 puntos por acierto — máx 16 pts' },
  { t:'bullet',  s:'Puntaje máximo posible: 76 puntos' },
  { t:'space',   h:4 },
  { t:'subhead', s:'Calendario de apertura de picks' },
  { t:'bullet',  s:'Dieciseisavos: disponible desde 27 Jun 2026 (primer partido: 28 Jun)' },
  { t:'bullet',  s:'Octavos: disponible desde 3 Jul 2026 (primer partido: 4 Jul)' },
  { t:'bullet',  s:'Cuartos: disponible desde 8 Jul 2026 (primer partido: 9 Jul)' },
  { t:'bullet',  s:'Semifinal: disponible desde 13 Jul 2026 (primer partido: 14 Jul)' },
  { t:'bullet',  s:'3er Lugar / Final: disponible desde 17 Jul 2026' },
  { t:'space',   h:6 },
  { t:'rule' },

  { t:'heading', s:'CÓMO PARTICIPAR' },
  { t:'subhead', s:'Paso 1 — Regístrate' },
  { t:'body',    s:'Ingresa a mundial.infrony.app. Puedes registrarte con tu correo electrónico y contraseña, o iniciar sesión rápido con tu cuenta de Google.' },
  { t:'space',   h:4 },
  { t:'subhead', s:'Paso 2 — Confirma tu pago' },
  { t:'body',    s:'Contacta al administrador (infrony@gmail.com) para confirmar el pago de tu inscripción: $5 para Fase de Grupos, $10 para Fase Eliminatoria. El administrador activará tu cuenta en la plataforma.' },
  { t:'space',   h:4 },
  { t:'subhead', s:'Paso 3 — Ingresa tus pronósticos' },
  { t:'bullet',  s:'Fase de Grupos: ve a "Partidos" y selecciona 1, X o 2 por partido; ve a "Grupos" y elige el 1° y 2° de cada grupo. Hazlo antes de las fechas límite.' },
  { t:'bullet',  s:'Fase Eliminatoria: desde el 27 de junio ve a "Eliminatorias" y selecciona el ganador de cada partido (requiere inscripción de $10 confirmada).' },
  { t:'space',   h:4 },
  { t:'subhead', s:'Paso 4 — Sigue tu puntaje' },
  { t:'body',    s:'En "Tabla" ves el ranking de todos los participantes en tiempo real. En "Mis Picks" revisas todos tus pronósticos y cuántos has acertado.' },
  { t:'space',   h:6 },
  { t:'rule' },

  { t:'heading', s:'PREMIOS Y DESEMPATE' },
  { t:'body',    s:'El 80% de cada pozo se entrega como premio; el 20% restante cubre costos administrativos.' },
  { t:'space',   h:4 },
  { t:'bullet',  s:'Fase de Grupos: pozo = $5 × participantes. Premio = 80% del pozo. Ejemplo: 10 jugadores → pozo $50 → premio $40.' },
  { t:'bullet',  s:'Fase Eliminatoria: pozo = $10 × participantes. Premio = 80% del pozo. Ejemplo: 10 jugadores → pozo $100 → premio $80.' },
  { t:'bullet',  s:'El ganador es el participante con mayor puntaje al cierre de cada fase.' },
  { t:'bullet',  s:'Desempate 1: mayor número de aciertos en rondas de mayor valor (Final > Semis > Cuartos...).' },
  { t:'bullet',  s:'Desempate 2: si persiste el empate, el 80% del pozo se divide en partes iguales entre los empatados.' },
  { t:'space',   h:6 },
  { t:'rule' },

  { t:'heading', s:'REGLAS GENERALES' },
  { t:'bullet',  s:'El administrador ingresa los resultados oficiales; la tabla se actualiza automáticamente.' },
  { t:'bullet',  s:'Solo cuenta el marcador al pitazo final (90 min en grupos; resultado final en eliminatorias).' },
  { t:'bullet',  s:'No se aceptan inscripciones después de que inicie el primer partido del torneo.' },
  { t:'bullet',  s:'La decisión del administrador es definitiva en casos no contemplados en estas reglas.' },
  { t:'space',   h:6 },
  { t:'rule' },

  { t:'heading', s:'CONTACTO' },
  { t:'bullet',  s:'Web: mundial.infrony.app' },
  { t:'bullet',  s:'Administrador: infrony@gmail.com' },
  { t:'bullet',  s:'Desarrollado con amor en Panamá por infrony.com' },
  { t:'space',   h:10 },
  { t:'center',  s:'Polla Mundial 2026 — Todos los derechos reservados', fs:8, font:'F3' },
];

// ── Generador de páginas PDF ─────────────────────────────────────────────────
function buildPages(blocks) {
  const pages = [];
  let tOps = [], gOps = [], y = PH - MT;

  function flush() {
    const s = [
      ...gOps,
      'BT', ...tOps, 'ET',
    ].join('\n');
    pages.push(s);
    tOps = []; gOps = []; y = PH - MT;
  }

  function need(h) { if (y - h < MB + 10) flush(); }

  function drawText(font, fs, x, yy, s) {
    tOps.push(`/${font} ${fs} Tf 1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm (${enc(s)}) Tj`);
  }

  function hline(yy) {
    gOps.push(`0.8 0.8 0.8 RG 0.5 w ${ML} ${yy.toFixed(2)} m ${(PW-ML)} ${yy.toFixed(2)} l S 0 0 0 RG`);
  }

  function banner(yy, h) {
    gOps.push(`0.78 0.063 0.18 rg ${ML-5} ${(yy-h*0.25).toFixed(2)} ${(CW+10).toFixed(2)} ${(h).toFixed(2)} re f 0 0 0 rg`);
  }

  for (const b of blocks) {
    switch (b.t) {
      case 'space':
        y -= (b.h || 8);
        break;

      case 'rule':
        need(10);
        y -= 3;
        hline(y);
        y -= 8;
        break;

      case 'title': {
        const fs = 20, h = fs * 1.8;
        need(h);
        banner(y, h);
        const x = (PW - sw(b.s, fs)) / 2;
        // white text over red banner
        tOps.push(`1 1 1 rg /${('F2')} ${fs} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${enc(b.s)}) Tj 0 0 0 rg`);
        y -= h;
        break;
      }

      case 'center': {
        const fs = b.fs || 11, font = b.font || 'F1';
        need(fs * 1.4);
        const x = (PW - sw(b.s, fs)) / 2;
        drawText(font, fs, x, y, b.s);
        y -= fs * 1.5;
        break;
      }

      case 'heading': {
        const fs = 12, h = fs * 2.2;
        need(h);
        y -= fs * 0.6;
        drawText('F2', fs, ML, y, b.s);
        y -= fs * 1.6;
        break;
      }

      case 'subhead': {
        const fs = 10.5;
        need(fs * 2);
        y -= fs * 0.4;
        drawText('F2', fs, ML, y, b.s);
        y -= fs * 1.5;
        break;
      }

      case 'body': {
        const fs = 10;
        const lines = wrap(b.s, fs, CW);
        for (const l of lines) {
          need(fs * 1.5);
          drawText('F1', fs, ML, y, l);
          y -= fs * 1.45;
        }
        break;
      }

      case 'bullet': {
        const fs = 10, indent = 14;
        const lines = wrap(b.s, fs, CW - indent);
        for (let i = 0; i < lines.length; i++) {
          need(fs * 1.5);
          if (i === 0) {
            drawText('F2', fs, ML, y, '-');
            drawText('F1', fs, ML + indent, y, lines[i]);
          } else {
            drawText('F1', fs, ML + indent, y, lines[i]);
          }
          y -= fs * 1.45;
        }
        break;
      }
    }
  }

  if (tOps.length || gOps.length) flush();
  return pages;
}

// ── Ensamblador de PDF ────────────────────────────────────────────────────────
function assemblePDF(pageStreams) {
  const objs = {}; // id → string
  let buf = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n\n'; // header + binary marker

  // Helper: record an object
  const offsets = {};
  function addObj(id, content) {
    offsets[id] = buf.length;
    buf += `${id} 0 obj\n${content}\nendobj\n\n`;
  }

  // Font objects
  addObj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  addObj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  addObj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');

  const resources = '<< /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >>';
  const mediaBox  = `[0 0 ${PW} ${PH}]`;

  // Content + Page objects per page
  const pageIds = [];
  let nextId = 6;

  for (const stream of pageStreams) {
    const contentId = nextId++;
    const pageId    = nextId++;
    pageIds.push(pageId);

    // Add page number footer to stream
    const pg = pageIds.length;
    const footer = `BT /F3 8 Tf 1 0 0 1 ${((PW - sw(`Polla Mundial 2026 — Página ${pg}`, 8)) / 2).toFixed(2)} 30 Tm (${enc(`Polla Mundial 2026 — Página ${pg}`)}) Tj ET`;
    const fullStream = stream + '\n' + footer;

    addObj(contentId,
      `<< /Length ${fullStream.length} >>\nstream\n${fullStream}\nendstream`
    );
    addObj(pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox ${mediaBox} /Contents ${contentId} 0 R /Resources ${resources} >>`
    );
  }

  // Pages dict
  addObj(2,
    `<< /Type /Pages /Kids [${pageIds.map(i => `${i} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  );

  // Catalog
  addObj(1, '<< /Type /Catalog /Pages 2 0 R >>');

  // xref
  const xrefOff = buf.length;
  const maxId   = Math.max(...Object.keys(offsets).map(Number));
  buf += `xref\n0 ${maxId + 1}\n`;
  buf += '0000000000 65535 f \n';
  for (let i = 1; i <= maxId; i++) {
    buf += `${String(offsets[i] || 0).padStart(10, '0')} 00000 n \n`;
  }
  buf += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOff}\n%%EOF\n`;

  return buf;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const pages  = buildPages(CONTENT);
const pdfStr = assemblePDF(pages);
const out    = path.join(__dirname, '..', 'docs', 'reglas-polla-mundial.pdf');
fs.writeFileSync(out, pdfStr, 'binary');
console.log(`✅ PDF generado: ${out} (${pages.length} página${pages.length > 1 ? 's' : ''})`);
