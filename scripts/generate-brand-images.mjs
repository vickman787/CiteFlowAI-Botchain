// Generates social/brand raster images from the vector logo:
//   src/app/opengraph-image.png  (1200x630 — link previews on X, WhatsApp, Discord, ...)
//   src/app/apple-icon.png       (180x180 — iOS home screen, Safari)
// Usage: node scripts/generate-brand-images.mjs
import sharp from 'sharp'
import { writeFileSync } from 'fs'

const SIGNAL = '#3FE7FF'
const BG = '#0A0E13'
const PANEL = '#0F1620'
const INK = '#DCEAF2'
const DIM = '#7E97A3'
const FAINT = '#47575F'
const MONO = "Consolas, 'Courier New', monospace"

const logo = (x, y, s) => `
  <g transform="translate(${x},${y}) scale(${s / 512})">
    <rect width="512" height="512" rx="118" fill="${SIGNAL}"/>
    <path d="M133,172 h96 v72 h-48 v32 h48 v64 h-96 z" fill="${BG}"/>
    <path d="M283,172 h96 v72 h-48 v32 h48 v64 h-96 z" fill="${BG}"/>
  </g>`

// ── opengraph-image (1200x630) ──────────────────────────────────
const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="${BG}"/>

  <!-- faint scanlines -->
  <g opacity="0.35">
    ${Array.from({ length: 79 }, (_, i) => `<rect x="0" y="${i * 8}" width="1200" height="3" fill="#000000" opacity="0.35"/>`).join('')}
  </g>

  <!-- top signal strip -->
  <rect width="1200" height="8" fill="${SIGNAL}"/>

  <!-- status line -->
  <circle cx="96" cy="96" r="7" fill="${SIGNAL}"/>
  <text x="118" y="104" font-family="${MONO}" font-size="22" letter-spacing="4" fill="${DIM}">LIVE ON BOT CHAIN · PAY-PER-CITATION · USDT</text>

  <!-- logo -->
  ${logo(88, 190, 230)}

  <!-- wordmark -->
  <text x="370" y="310" font-family="${MONO}" font-size="96" font-weight="700" fill="${INK}">cite<tspan fill="${SIGNAL}">flow</tspan>_ai</text>

  <!-- tagline -->
  <text x="374" y="382" font-family="${MONO}" font-size="36" fill="${DIM}">Every citation pays its author.</text>

  <!-- terminal footer -->
  <rect x="88" y="484" width="1024" height="66" rx="4" fill="${PANEL}" stroke="rgba(220,234,242,0.14)"/>
  <text x="116" y="526" font-family="${MONO}" font-size="26" fill="${SIGNAL}">❯</text>
  <text x="148" y="526" font-family="${MONO}" font-size="26" fill="${INK}">ask --grounded --pay-per-citation</text>
  <rect x="640" y="504" width="14" height="30" fill="${SIGNAL}"/>
  <text x="1084" y="526" font-family="${MONO}" font-size="24" fill="${FAINT}" text-anchor="end">chain 677</text>
</svg>`

await sharp(Buffer.from(og)).png().toFile('src/app/opengraph-image.png')
console.log('✓ src/app/opengraph-image.png (1200x630)')

writeFileSync('src/app/opengraph-image.alt.txt', 'citeflow_ai — Every citation pays its author. Live on BOT Chain.')
console.log('✓ src/app/opengraph-image.alt.txt')

// ── apple-icon (180x180) ────────────────────────────────────────
const appleIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
  ${logo(0, 0, 180)}
</svg>`

await sharp(Buffer.from(appleIcon)).png().toFile('src/app/apple-icon.png')
console.log('✓ src/app/apple-icon.png (180x180)')
