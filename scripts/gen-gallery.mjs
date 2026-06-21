/**
 * Generates elegant, on-brand placeholder "photos" for the gallery as SVG files.
 * These are intentionally tasteful stand-ins — replace the files in
 * public/gallery/ with real photography from past editions when available
 * (keep the same filenames and the gallery picks them up automatically).
 *
 * Run:  node scripts/gen-gallery.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'gallery');
mkdirSync(OUT, { recursive: true });

const INK = '#0b0b0a';
const PANEL = '#161310';
const GOLD = '#c9a227';
const GOLD_SOFT = '#e3c77b';

// Shared defs: warm vignette + film grain + soft glow.
const defs = (id) => `
  <defs>
    <radialGradient id="bg-${id}" cx="50%" cy="38%" r="85%">
      <stop offset="0%" stop-color="${PANEL}"/>
      <stop offset="60%" stop-color="${INK}"/>
      <stop offset="100%" stop-color="#050504"/>
    </radialGradient>
    <radialGradient id="glow-${id}" cx="50%" cy="42%" r="40%">
      <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
    </radialGradient>
    <filter id="grain-${id}">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.06"/></feComponentTransfer>
      <feComposite operator="over" in2="SourceGraphic"/>
    </filter>
  </defs>`;

// Frame: background, glow, grain overlay, corner ticks.
const frame = (id, w, h, art) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
  ${defs(id)}
  <rect width="${w}" height="${h}" fill="url(#bg-${id})"/>
  <rect width="${w}" height="${h}" fill="url(#glow-${id})"/>
  <g fill="none" stroke="${GOLD}" stroke-width="2" opacity="0.95">${art}</g>
  <rect width="${w}" height="${h}" filter="url(#grain-${id})" opacity="0.5"/>
  <g stroke="${GOLD_SOFT}" stroke-width="2" opacity="0.55">
    <path d="M28 28 h34 M28 28 v34"/>
    <path d="M${w - 28} 28 h-34 M${w - 28} 28 v34"/>
    <path d="M28 ${h - 28} h34 M28 ${h - 28} v-34"/>
    <path d="M${w - 28} ${h - 28} h-34 M${w - 28} ${h - 28} v-34"/>
  </g>
</svg>`;

// A candle with flame + glow.
const candle = (cx, baseY, scale = 1) => `
  <g transform="translate(${cx} ${baseY}) scale(${scale})">
    <ellipse cx="0" cy="0" rx="14" ry="5" fill="${GOLD}" opacity="0.18" stroke="none"/>
    <rect x="-9" y="-70" width="18" height="70" rx="3"/>
    <line x1="0" y1="-70" x2="0" y2="-84"/>
    <path d="M0 -84 q12 -16 0 -34 q-12 18 0 34 z" fill="${GOLD}" opacity="0.35"/>
    <path d="M0 -88 q7 -10 0 -22 q-7 12 0 22 z" fill="${GOLD_SOFT}" opacity="0.7" stroke="none"/>
  </g>`;

const flute = (x, y, tilt) => `
  <g transform="translate(${x} ${y}) rotate(${tilt})">
    <path d="M-16 -90 q16 40 0 70 q-16 -30 0 -70 z"/>
    <line x1="0" y1="-20" x2="0" y2="36"/>
    <line x1="-18" y1="40" x2="18" y2="40"/>
    <circle cx="-6" cy="-78" r="2.4" fill="${GOLD_SOFT}" stroke="none"/>
    <circle cx="4" cy="-66" r="1.8" fill="${GOLD_SOFT}" stroke="none"/>
    <circle cx="-2" cy="-54" r="1.5" fill="${GOLD_SOFT}" stroke="none"/>
  </g>`;

const figure = (x, y, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="0" cy="-86" r="16"/>
    <path d="M-26 0 q0 -64 26 -64 q26 0 26 64 z"/>
  </g>`;

const scenes = {
  // Candlelit table — portrait
  candles: () => frame('candles', 800, 1000, `
    ${candle(260, 640, 2.1)}
    ${candle(540, 600, 2.6)}
    ${candle(400, 700, 3.0)}
    <line x1="120" y1="760" x2="680" y2="760" opacity="0.5"/>
    <path d="M180 760 q220 -50 440 0" opacity="0.4"/>
  `),

  // Chandelier — portrait
  chandelier: () => frame('chandelier', 800, 1000, `
    <line x1="400" y1="80" x2="400" y2="240"/>
    <path d="M250 300 q150 -120 300 0" />
    <path d="M210 400 q190 -150 380 0" />
    <g>
      ${[210, 300, 400, 500, 590].map((x) => `<line x1="${x}" y1="${300 + Math.abs(400 - x) * 0.3}" x2="${x}" y2="${470}"/><circle cx="${x}" cy="490" r="10" fill="${GOLD}" opacity="0.25"/>`).join('')}
    </g>
    <circle cx="400" cy="260" r="20" fill="${GOLD}" opacity="0.3"/>
  `),

  // Champagne toast — landscape
  toast: () => frame('toast', 1100, 800, `
    ${flute(470, 470, -16)}
    ${flute(630, 470, 16)}
    <path d="M180 560 h740" opacity="0.4"/>
  `),

  // Floral centerpiece — square
  florals: () => frame('florals', 900, 900, `
    <g transform="translate(450 470)">
      ${Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        const x = Math.cos(a) * 120, y = Math.sin(a) * 120;
        return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="46"/><line x1="0" y1="0" x2="${x.toFixed(0)}" y2="${y.toFixed(0)}" opacity="0.5"/>`;
      }).join('')}
      <circle cx="0" cy="0" r="40" fill="${GOLD}" opacity="0.25"/>
    </g>
    <path d="M360 540 q90 120 180 0 l-20 150 h-140 z"/>
  `),

  // String quartet / violin — landscape
  quartet: () => frame('quartet', 1100, 800, `
    <g transform="translate(420 440) rotate(-24)">
      <path d="M0 -150 q-50 40 -40 120 q-40 30 -40 90 q0 60 60 60 q60 0 60 -60 q0 -60 -40 -90 q10 -80 -40 -120 z"/>
      <line x1="-6" y1="-150" x2="-6" y2="120"/>
      <line x1="6" y1="-150" x2="6" y2="120"/>
    </g>
    <g stroke-width="2.4">
      <path d="M760 240 q60 -30 60 40 v150" />
      <ellipse cx="752" cy="430" rx="22" ry="14"/>
      <path d="M880 300 q60 -30 60 40 v120" />
      <ellipse cx="872" cy="460" rx="20" ry="13"/>
    </g>
  `),

  // Guests in white — landscape
  guests: () => frame('guests', 1100, 800, `
    ${figure(330, 620, 1.5)}
    ${figure(560, 600, 1.8)}
    ${figure(790, 625, 1.5)}
    <path d="M140 660 h820" opacity="0.35"/>
  `),

  // Banquet table set — square (top-down feel)
  banquet: () => frame('banquet', 900, 900, `
    <rect x="180" y="300" width="540" height="300" rx="20" opacity="0.6"/>
    ${[280, 450, 620].map((x) => `<circle cx="${x}" cy="450" r="46"/><line x1="${x - 60}" y1="450" x2="${x - 70}" y2="450"/><line x1="${x + 60}" y1="450" x2="${x + 70}" y2="450"/>`).join('')}
    ${candle(450, 360, 1.1)}
  `),

  // Entrance archway — portrait
  archway: () => frame('archway', 800, 1000, `
    <path d="M220 760 v-360 q180 -200 360 0 v360" />
    <path d="M280 760 v-330 q120 -150 240 0 v330" opacity="0.5"/>
    <line x1="160" y1="760" x2="640" y2="760"/>
    ${candle(230, 760, 1.2)}
    ${candle(570, 760, 1.2)}
  `),

  // Dance floor sparkle — square
  dancefloor: () => frame('dancefloor', 900, 900, `
    ${figure(380, 600, 1.3)}
    ${figure(540, 600, 1.3)}
    ${Array.from({ length: 14 }).map(() => {
      const x = (100 + Math.random() * 700).toFixed(0);
      const y = (120 + Math.random() * 360).toFixed(0);
      const r = (2 + Math.random() * 4).toFixed(1);
      return `<circle cx="${x}" cy="${y}" r="${r}" fill="${GOLD_SOFT}" stroke="none" opacity="0.8"/>`;
    }).join('')}
  `),

  // Crest with rays — square
  crestglow: () => frame('crestglow', 900, 900, `
    <g transform="translate(450 450)">
      ${Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return `<line x1="${(Math.cos(a) * 170).toFixed(0)}" y1="${(Math.sin(a) * 170).toFixed(0)}" x2="${(Math.cos(a) * 240).toFixed(0)}" y2="${(Math.sin(a) * 240).toFixed(0)}" opacity="0.5"/>`;
      }).join('')}
      <circle cx="0" cy="0" r="120"/>
      <circle cx="0" cy="0" r="100"/>
      <text x="0" y="14" text-anchor="middle" font-family="Georgia, serif" font-size="56" font-weight="600" fill="${GOLD}" stroke="none">N·O·A</text>
    </g>
  `),
};

let count = 0;
for (const [name, build] of Object.entries(scenes)) {
  writeFileSync(join(OUT, `${name}.svg`), build().trim());
  count++;
}
console.log(`Generated ${count} gallery placeholders in public/gallery/`);
