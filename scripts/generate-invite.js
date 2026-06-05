#!/usr/bin/env node
'use strict';
/**
 * Genera docs/invitacion-polla-mundial.svg (y .png si sharp está disponible).
 * Uso: node scripts/generate-invite.js
 */
const fs   = require('fs');
const path = require('path');

const W = 1080, H = 1920;

// ── Helpers ───────────────────────────────────────────────────────────────────
const cx = W / 2;

function stars(n, seed) {
  let out = '';
  let x = seed * 1234.5;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280;
    const px = (x / 233280) * W;
    x = (x * 9301 + 49297) % 233280;
    const py = (x / 233280) * (H * 0.55);
    x = (x * 9301 + 49297) % 233280;
    const r  = 1 + (x / 233280) * 2.5;
    x = (x * 9301 + 49297) % 233280;
    const op = 0.3 + (x / 233280) * 0.7;
    out += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(1)}" fill="white" opacity="${op.toFixed(2)}"/>`;
  }
  return out;
}

function confetti(n, seed) {
  const colors = ['#F5A623','#C8102E','#003DA5','#ffffff','#2ecc71','#e74c3c','#f39c12'];
  let out = '', x = seed * 777.3;
  for (let i = 0; i < n; i++) {
    x = (x * 9301 + 49297) % 233280; const px = (x / 233280) * W;
    x = (x * 9301 + 49297) % 233280; const py = 200 + (x / 233280) * (H * 0.5);
    x = (x * 9301 + 49297) % 233280; const size = 6 + (x / 233280) * 14;
    x = (x * 9301 + 49297) % 233280; const rot  = (x / 233280) * 360;
    x = (x * 9301 + 49297) % 233280; const col  = colors[Math.floor((x / 233280) * colors.length)];
    x = (x * 9301 + 49297) % 233280; const op   = 0.4 + (x / 233280) * 0.5;
    out += `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${size.toFixed(1)}" height="${(size*0.4).toFixed(1)}" fill="${col}" opacity="${op.toFixed(2)}" transform="rotate(${rot.toFixed(1)},${px.toFixed(1)},${py.toFixed(1)})"/>`;
  }
  return out;
}

// ── SVG ───────────────────────────────────────────────────────────────────────
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg">
<defs>
  <!-- Backgrounds -->
  <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="#000d1f"/>
    <stop offset="35%"  stop-color="#001a4d"/>
    <stop offset="70%"  stop-color="#001133"/>
    <stop offset="100%" stop-color="#000508"/>
  </linearGradient>

  <!-- Stadium light glow -->
  <radialGradient id="glow1" cx="20%" cy="18%" r="40%">
    <stop offset="0%"  stop-color="#4488ff" stop-opacity="0.35"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glow2" cx="80%" cy="18%" r="40%">
    <stop offset="0%"  stop-color="#4488ff" stop-opacity="0.35"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="glow3" cx="50%" cy="60%" r="55%">
    <stop offset="0%"  stop-color="#003DA5" stop-opacity="0.2"/>
    <stop offset="100%" stop-color="#000" stop-opacity="0"/>
  </radialGradient>

  <!-- Ball gradient -->
  <radialGradient id="ballGrad" cx="38%" cy="35%" r="60%">
    <stop offset="0%"   stop-color="#ffffff"/>
    <stop offset="60%"  stop-color="#dddddd"/>
    <stop offset="100%" stop-color="#888888"/>
  </radialGradient>

  <!-- Gold gradient for title -->
  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="#FFE066"/>
    <stop offset="40%"  stop-color="#F5A623"/>
    <stop offset="100%" stop-color="#C67700"/>
  </linearGradient>

  <!-- Red gradient for banners -->
  <linearGradient id="redGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="#8B0000"/>
    <stop offset="30%"  stop-color="#C8102E"/>
    <stop offset="70%"  stop-color="#C8102E"/>
    <stop offset="100%" stop-color="#8B0000"/>
  </linearGradient>
  <linearGradient id="redGrad2" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%"   stop-color="#6B0000"/>
    <stop offset="50%"  stop-color="#A00020"/>
    <stop offset="100%" stop-color="#6B0000"/>
  </linearGradient>

  <!-- Grass -->
  <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="#1a7a1a"/>
    <stop offset="100%" stop-color="#0d4d0d"/>
  </linearGradient>

  <!-- Prize box -->
  <linearGradient id="prizeGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="#1a2a4a"/>
    <stop offset="100%" stop-color="#0d1a33"/>
  </linearGradient>

  <!-- Glow filter -->
  <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
    <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.8"/>
  </filter>
  <filter id="textShadow" x="-5%" y="-5%" width="110%" height="120%">
    <feDropShadow dx="3" dy="3" stdDeviation="5" flood-color="#000" flood-opacity="0.9"/>
  </filter>
</defs>

<!-- ── BASE ─────────────────────────────────────────────────────────────── -->
<rect width="${W}" height="${H}" fill="url(#bgGrad)"/>
<rect width="${W}" height="${H}" fill="url(#glow1)"/>
<rect width="${W}" height="${H}" fill="url(#glow2)"/>
<rect width="${W}" height="${H}" fill="url(#glow3)"/>

<!-- Stars -->
${stars(120, 7)}

<!-- Confetti -->
${confetti(80, 13)}

<!-- ── STADIUM ───────────────────────────────────────────────────────────── -->
<!-- Grass field at bottom -->
<ellipse cx="${cx}" cy="${H}" rx="700" ry="240" fill="url(#grassGrad)" opacity="0.6"/>
<!-- Field lines -->
<ellipse cx="${cx}" cy="${H}" rx="480" ry="165" fill="none" stroke="#2a9a2a" stroke-width="3" opacity="0.4"/>
<line x1="${cx}" y1="${H-260}" x2="${cx}" y2="${H}" stroke="#2a9a2a" stroke-width="2" opacity="0.3"/>

<!-- Stadium silhouette arches left -->
<path d="M -20 ${H*0.62} Q 80 ${H*0.35} 220 ${H*0.38} L 220 ${H*0.62} Z" fill="#001133" opacity="0.7"/>
<path d="M -20 ${H*0.62} Q 80 ${H*0.35} 220 ${H*0.38}" fill="none" stroke="#1a4a8a" stroke-width="4" opacity="0.5"/>
<!-- Stadium silhouette arches right -->
<path d="M ${W+20} ${H*0.62} Q ${W-80} ${H*0.35} ${W-220} ${H*0.38} L ${W-220} ${H*0.62} Z" fill="#001133" opacity="0.7"/>
<path d="M ${W+20} ${H*0.62} Q ${W-80} ${H*0.35} ${W-220} ${H*0.38}" fill="none" stroke="#1a4a8a" stroke-width="4" opacity="0.5"/>

<!-- Floodlights -->
<line x1="130" y1="0" x2="200" y2="${H*0.55}" stroke="#ffffff" stroke-width="2" opacity="0.08"/>
<line x1="${W-130}" y1="0" x2="${W-200}" y2="${H*0.55}" stroke="#ffffff" stroke-width="2" opacity="0.08"/>

<!-- ── TOP STRIP ─────────────────────────────────────────────────────────── -->
<rect x="0" y="0" width="${W}" height="90" fill="url(#redGrad)"/>
<rect x="0" y="82" width="${W}" height="10" fill="url(#goldGrad)"/>

<text x="${cx}" y="60" text-anchor="middle"
      font-family="Impact, Arial Black, sans-serif" font-size="42" fill="white"
      filter="url(#textShadow)" letter-spacing="6">
  ⚽  MUNDIAL 2026  ⚽
</text>

<!-- ── TROPHY / BALL ────────────────────────────────────────────────────── -->
<!-- Glow behind ball -->
<circle cx="${cx}" cy="310" r="165" fill="#003DA5" opacity="0.25" filter="url(#strongGlow)"/>
<circle cx="${cx}" cy="310" r="130" fill="#F5A623" opacity="0.1" filter="url(#strongGlow)"/>

<!-- Ball -->
<circle cx="${cx}" cy="305" r="118" fill="url(#ballGrad)" filter="url(#shadow)"/>
<!-- Pentagon patches -->
<polygon points="${cx},192 ${cx-45},222 ${cx-28},268 ${cx+28},268 ${cx+45},222" fill="#1a1a1a" opacity="0.85"/>
<polygon points="${cx-45},222 ${cx-108},222 ${cx-120},270 ${cx-70},298 ${cx-28},268" fill="#1a1a1a" opacity="0.85"/>
<polygon points="${cx+45},222 ${cx+108},222 ${cx+120},270 ${cx+70},298 ${cx+28},268" fill="#1a1a1a" opacity="0.85"/>
<polygon points="${cx-28},268 ${cx-70},298 ${cx-50},340 ${cx+50},340 ${cx+70},298 ${cx+28},268" fill="#1a1a1a" opacity="0.85"/>
<polygon points="${cx-120},270 ${cx-148},320 ${cx-100},360 ${cx-50},340 ${cx-70},298" fill="#1a1a1a" opacity="0.85"/>
<polygon points="${cx+120},270 ${cx+148},320 ${cx+100},360 ${cx+50},340 ${cx+70},298" fill="#1a1a1a" opacity="0.85"/>
<!-- Shine -->
<ellipse cx="${cx-38}" cy="258" rx="32" ry="20" fill="white" opacity="0.35"/>

<!-- Stars around ball -->
<text x="${cx-170}" y="320" font-size="48" opacity="0.9">⭐</text>
<text x="${cx+130}" y="320" font-size="48" opacity="0.9">⭐</text>
<text x="${cx-100}" y="230" font-size="36" opacity="0.7">✦</text>
<text x="${cx+75}" y="230" font-size="36" opacity="0.7">✦</text>

<!-- ── MAIN TITLE ────────────────────────────────────────────────────────── -->
<!-- Title background glow -->
<rect x="40" y="455" width="${W-80}" height="240" rx="20" fill="#001a4d" opacity="0.7"/>
<rect x="40" y="455" width="${W-80}" height="240" rx="20" fill="none" stroke="url(#goldGrad)" stroke-width="3"/>

<!-- POLLA -->
<text x="${cx}" y="535"
      text-anchor="middle" dominant-baseline="middle"
      font-family="Impact, Arial Black, sans-serif"
      font-size="128" fill="url(#goldGrad)"
      filter="url(#textShadow)" letter-spacing="4">
  POLLA
</text>
<!-- MUNDIALISTA -->
<text x="${cx}" y="624"
      text-anchor="middle" dominant-baseline="middle"
      font-family="Impact, Arial Black, sans-serif"
      font-size="106" fill="white"
      filter="url(#textShadow)" letter-spacing="3">
  MUNDIALISTA
</text>
<!-- 2026 -->
<text x="${cx}" y="685"
      text-anchor="middle" dominant-baseline="middle"
      font-family="Impact, Arial Black, sans-serif"
      font-size="60" fill="url(#goldGrad)"
      filter="url(#textShadow)" letter-spacing="14">
  2 0 2 6
</text>

<!-- Divider -->
<rect x="120" y="710" width="${W-240}" height="4" rx="2" fill="url(#goldGrad)"/>

<!-- ── TAGLINE ────────────────────────────────────────────────────────────── -->
<text x="${cx}" y="770"
      text-anchor="middle"
      font-family="Arial, sans-serif" font-size="40" fill="#a8c8ff"
      letter-spacing="2">
  PREDICE · COMPITE · GANA
</text>

<!-- ── PRIZE BOXES ───────────────────────────────────────────────────────── -->
<!-- Left box -->
<rect x="55" y="810" width="455" height="200" rx="18" fill="url(#prizeGrad)" filter="url(#shadow)"/>
<rect x="55" y="810" width="455" height="200" rx="18" fill="none" stroke="#F5A623" stroke-width="2.5"/>
<text x="282" y="858" text-anchor="middle"
      font-family="Impact, Arial Black, sans-serif" font-size="36" fill="#F5A623" letter-spacing="2">
  FASE DE GRUPOS
</text>
<text x="282" y="918" text-anchor="middle"
      font-family="Impact, Arial Black, sans-serif" font-size="80" fill="url(#goldGrad)"
      filter="url(#glow)">
  $5
</text>
<text x="282" y="985" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="30" fill="#aaddff">
  por participante
</text>

<!-- Right box -->
<rect x="570" y="810" width="455" height="200" rx="18" fill="url(#prizeGrad)" filter="url(#shadow)"/>
<rect x="570" y="810" width="455" height="200" rx="18" fill="none" stroke="#C8102E" stroke-width="2.5"/>
<text x="797" y="858" text-anchor="middle"
      font-family="Impact, Arial Black, sans-serif" font-size="32" fill="#ff7788" letter-spacing="2">
  FASE ELIMINATORIA
</text>
<text x="797" y="918" text-anchor="middle"
      font-family="Impact, Arial Black, sans-serif" font-size="80" fill="#ff9999"
      filter="url(#glow)">
  $10
</text>
<text x="797" y="985" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="30" fill="#aaddff">
  por participante
</text>

<!-- ── SCORING INFO ──────────────────────────────────────────────────────── -->
<rect x="55" y="1040" width="${W-110}" height="120" rx="14" fill="rgba(0,30,80,0.7)"/>
<rect x="55" y="1040" width="${W-110}" height="120" rx="14" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5"/>
<text x="${cx}" y="1080" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="31" fill="rgba(255,255,255,0.75)">
  Más participantes = Mayor pozo de premios
</text>
<text x="${cx}" y="1128" text-anchor="middle"
      font-family="Arial Bold, Arial, sans-serif" font-size="32" fill="#F5A623" font-weight="bold">
  ¡Invita a tus amigos y sube el premio!
</text>

<!-- ── DEADLINE ──────────────────────────────────────────────────────────── -->
<rect x="0" y="1190" width="${W}" height="140" fill="url(#redGrad)"/>
<rect x="0" y="1185" width="${W}" height="8" fill="url(#goldGrad)"/>
<rect x="0" y="1322" width="${W}" height="8" fill="url(#goldGrad)"/>

<text x="${cx}" y="1244" text-anchor="middle"
      font-family="Impact, Arial Black, sans-serif" font-size="38" fill="white"
      letter-spacing="4">
  INSCRIPCION HASTA EL
</text>
<text x="${cx}" y="1305" text-anchor="middle"
      font-family="Impact, Arial Black, sans-serif" font-size="58" fill="url(#goldGrad)"
      filter="url(#textShadow)" letter-spacing="4">
  10 DE JUNIO 2026
</text>

<!-- ── HOW TO JOIN ───────────────────────────────────────────────────────── -->
<rect x="55" y="1355" width="${W-110}" height="290" rx="18" fill="rgba(0,20,60,0.85)" filter="url(#shadow)"/>
<rect x="55" y="1355" width="${W-110}" height="290" rx="18" fill="none" stroke="rgba(91,156,246,0.4)" stroke-width="2"/>

<text x="${cx}" y="1405" text-anchor="middle"
      font-family="Impact, Arial Black, sans-serif" font-size="40" fill="#5b9cf6" letter-spacing="3">
  CÓMO PARTICIPAR
</text>

<text x="120" y="1458" font-family="Arial, sans-serif" font-size="32" fill="url(#goldGrad)" font-weight="bold">1.</text>
<text x="165" y="1458" font-family="Arial, sans-serif" font-size="31" fill="white">Regístrate gratis en la plataforma</text>

<text x="120" y="1510" font-family="Arial, sans-serif" font-size="32" fill="url(#goldGrad)" font-weight="bold">2.</text>
<text x="165" y="1510" font-family="Arial, sans-serif" font-size="31" fill="white">Paga tu inscripción al admin</text>

<text x="120" y="1562" font-family="Arial, sans-serif" font-size="32" fill="url(#goldGrad)" font-weight="bold">3.</text>
<text x="165" y="1562" font-family="Arial, sans-serif" font-size="31" fill="white">Ingresa tus pronósticos</text>

<text x="120" y="1614" font-family="Arial, sans-serif" font-size="32" fill="url(#goldGrad)" font-weight="bold">4.</text>
<text x="165" y="1614" font-family="Arial, sans-serif" font-size="31" fill="white">Sigue el marcador en tiempo real</text>

<!-- ── WEBSITE ───────────────────────────────────────────────────────────── -->
<rect x="55" y="1675" width="${W-110}" height="120" rx="18"
      fill="rgba(245,166,35,0.12)" filter="url(#shadow)"/>
<rect x="55" y="1675" width="${W-110}" height="120" rx="18"
      fill="none" stroke="url(#goldGrad)" stroke-width="3"/>

<text x="${cx}" y="1718" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="30" fill="rgba(255,255,255,0.6)" letter-spacing="2">
  PLATAFORMA OFICIAL
</text>
<text x="${cx}" y="1774" text-anchor="middle"
      font-family="Impact, Arial Black, sans-serif" font-size="56" fill="url(#goldGrad)"
      filter="url(#glow)" letter-spacing="1">
  mundial.infrony.app
</text>

<!-- ── BOTTOM STRIP ──────────────────────────────────────────────────────── -->
<rect x="0" y="1820" width="${W}" height="100" fill="url(#redGrad2)"/>
<rect x="0" y="1817" width="${W}" height="5" fill="url(#goldGrad)"/>

<!-- Flags -->
<text x="80"  y="1882" font-size="52" text-anchor="middle">🇺🇸</text>
<text x="200" y="1882" font-size="52" text-anchor="middle">🇲🇽</text>
<text x="320" y="1882" font-size="52" text-anchor="middle">🇨🇦</text>
<text x="760" y="1882" font-size="52" text-anchor="middle">🇵🇦</text>

<text x="${cx+80}" y="1878" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="28" fill="rgba(255,255,255,0.8)" letter-spacing="1">
  Hecho con amor en Panamá por infrony.com
</text>

</svg>`;

// ── Write SVG ─────────────────────────────────────────────────────────────────
const outSVG = path.join(__dirname, '..', 'docs', 'invitacion-polla-mundial.svg');
fs.writeFileSync(outSVG, svg, 'utf8');
console.log(`✅ SVG generado: ${outSVG}`);

// ── Try to convert to PNG ─────────────────────────────────────────────────────
// Option 1: sharp
async function trySharp() {
  try {
    const sharp = require('sharp');
    const outPNG = path.join(__dirname, '..', 'docs', 'invitacion-polla-mundial.png');
    await sharp(Buffer.from(svg)).png().toFile(outPNG);
    console.log(`✅ PNG generado: ${outPNG}`);
    return true;
  } catch { return false; }
}

// Option 2: Inkscape CLI
function tryInkscape(svgPath) {
  const { execSync } = require('child_process');
  const outPNG = svgPath.replace('.svg', '.png');
  try {
    execSync(`inkscape --export-type=png --export-width=1080 "${svgPath}" -o "${outPNG}"`, { stdio:'pipe' });
    console.log(`✅ PNG generado con Inkscape: ${outPNG}`);
    return true;
  } catch { return false; }
}

// Option 3: Chrome/Chromium headless
function tryChrome(svgPath) {
  const { execSync } = require('child_process');
  const outPNG = svgPath.replace('.svg', '.png');
  const chromePaths = [
    '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"',
    '"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"',
  ];
  for (const chrome of chromePaths) {
    try {
      execSync(`${chrome} --headless --disable-gpu --screenshot="${outPNG}" --window-size=1080,1920 "file:///${svgPath.replace(/\\/g,'/').replace(/^\//, '')}"`, { stdio:'pipe', timeout: 15000 });
      console.log(`✅ PNG generado con Chrome: ${outPNG}`);
      return true;
    } catch {}
  }
  return false;
}

(async () => {
  if (await trySharp()) return;
  if (tryInkscape(outSVG)) return;
  if (tryChrome(outSVG)) return;
  console.log(`ℹ️  Para convertir a PNG abre el SVG en Chrome y usa "Guardar como imagen".`);
  console.log(`   O ejecuta: npx sharp-cli -i docs/invitacion-polla-mundial.svg -o docs/invitacion-polla-mundial.png`);
})();
