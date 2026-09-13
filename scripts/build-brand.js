'use strict';

/**
 * Build every brand asset from the one mark in src/bank/site/logo.js.
 *
 *   node scripts/build-brand.js
 *
 * Writes the standalone SVGs, then rasterises the favicons and the link card
 * by rendering them in Chromium - the only image toolchain this project can
 * assume, and the same one the browser tests already use. Nothing here runs on
 * a normal build: the outputs are committed, because they change about as
 * often as the bank changes its name.
 *
 * The favicons deliberately drop the fine line work. Two fractures and six
 * columns are three pixels of grey at 16 x 16; the silhouette alone still
 * reads as a rock with a building in front of it.
 */

const fs = require('fs');
const path = require('path');
const logo = require('../src/bank/site/logo');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const BRAND = path.join(PUBLIC, 'assets', 'bank');

const NAVY = '#11213a';
const BRASS = '#b08341';
const BRASS_LIGHT = '#caa062';
const PAPER = '#ffffff';

/* ------------------------------------------------------------------ SVG -- */

const SVGS = [
  ['mark-dark.svg', logo.markFile(NAVY)],
  ['mark-light.svg', logo.markFile(PAPER)],
  ['wordmark-dark.svg', logo.wordmark(NAVY, '#7d6a4e')],
  ['wordmark-light.svg', logo.wordmark(PAPER, BRASS_LIGHT)],
];

/* ------------------------------------------------------------ rasterise -- */

/**
 * The icon tile: the mark in white on a navy square.
 *
 * Below 128px it switches to the filled reduction. Stroked line work needs
 * roughly three pixels to hold an edge, and a 16px icon has none to spare.
 */
function iconHtml(size) {
  const small = size < 128;
  const tiny = size <= 20;
  const inset = Math.round(size * (small ? 0.13 : 0.15));
  const art = small
    ? logo.glyph({ height: Math.round(size * (tiny ? 0.62 : 0.5)), hallOnly: tiny })
    : logo.emblem({ height: Math.round(size * 0.5), weight: 8, detail: size >= 160 });
  return `<!doctype html><html><body style="margin:0">
    <div style="width:${size}px;height:${size}px;background:${NAVY};border-radius:${Math.round(size * 0.22)}px;
                display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:${inset}px">
      <div style="color:${PAPER};display:flex">${art}</div>
    </div>
  </body></html>`;
}

/** The link card: what a shared URL unfurls into. */
function cardHtml() {
  return `<!doctype html><html><body style="margin:0">
    <div style="width:1200px;height:630px;background:${NAVY};position:relative;overflow:hidden;
                display:flex;flex-direction:column;align-items:center;justify-content:center;
                font-family:Georgia,'Liberation Serif','Times New Roman',serif">
      <div style="position:absolute;inset:0;
                  background:radial-gradient(60% 50% at 78% 12%, rgba(176,131,65,.30), transparent 70%),
                             radial-gradient(50% 45% at 8% 92%, rgba(41,74,119,.55), transparent 70%)"></div>

      <div style="position:relative;color:${PAPER};display:flex;margin-bottom:26px">
        ${logo.emblem({ height: 150, weight: 6.5, detail: true })}
      </div>

      <div style="position:relative;color:${PAPER};font-size:76px;letter-spacing:11px;line-height:1">ROCKFIELD</div>

      <div style="position:relative;display:flex;align-items:center;gap:22px;margin-top:20px">
        <span style="width:96px;height:2px;background:${BRASS_LIGHT};opacity:.8"></span>
        <span style="color:${BRASS_LIGHT};font-family:Helvetica,'Liberation Sans',Arial,sans-serif;
                     font-size:30px;letter-spacing:15px;padding-left:15px">BANK</span>
        <span style="width:96px;height:2px;background:${BRASS_LIGHT};opacity:.8"></span>
      </div>

      <div style="position:relative;color:#c3d0e2;font-size:30px;margin-top:44px">Banking built on bedrock.</div>

      <div style="position:absolute;bottom:40px;color:#7f91ab;
                  font-family:Helvetica,'Liberation Sans',Arial,sans-serif;font-size:16px;letter-spacing:3px">
        MEMBER FDIC &middot; EQUAL HOUSING LENDER
      </div>
    </div>
  </body></html>`;
}

/* ------------------------------------------------------------------ ICO -- */

/**
 * Wrap PNGs in an ICO container.
 *
 * The format allows a PNG payload per entry rather than a bitmap, which every
 * browser since IE11 reads, and which saves writing a BMP encoder by hand.
 * Layout: a 6-byte directory header, one 16-byte entry per image, then the
 * payloads. A size of 256 is written as 0, which is the format's way of
 * saying "not 1..255".
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = [];
  const payloads = [];

  for (const { size, png } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette size, 0 for true colour
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    payloads.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...entries, ...payloads]);
}

/* ------------------------------------------------------------------ run -- */

(async () => {
  fs.mkdirSync(BRAND, { recursive: true });

  for (const [name, svg] of SVGS) {
    fs.writeFileSync(path.join(BRAND, name), svg, 'utf8');
    console.log(`  wrote assets/bank/${name} (${(svg.length / 1024).toFixed(1)}kB)`);
  }

  let chromium;
  try {
    ({ chromium } = require('playwright-core'));
  } catch (err) {
    console.log('\n[brand] playwright-core is not installed, so the SVGs are written but');
    console.log('[brand] the favicons and link card were not rasterised.');
    console.log('[brand] npm i -D playwright-core, then run this again.');
    return;
  }

  const executablePath = ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome']
    .concat(process.env.CHROME_PATH || [])
    .find((candidate) => { try { return fs.existsSync(candidate); } catch (e) { return false; } });

  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const shoot = async (html, width, height) => {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(html);
    const buffer = await page.screenshot({ omitBackground: true });
    await page.close();
    return buffer;
  };

  try {
    const sizes = [512, 180, 48, 32, 16];
    const icons = {};
    for (const size of sizes) icons[size] = await shoot(iconHtml(size), size, size);

    fs.writeFileSync(path.join(PUBLIC, 'favicon.png'), icons[512]);
    fs.writeFileSync(path.join(PUBLIC, 'apple-touch-icon.png'), icons[180]);
    fs.writeFileSync(path.join(BRAND, 'icon-512.png'), icons[512]);
    fs.writeFileSync(
      path.join(PUBLIC, 'favicon.ico'),
      ico([16, 32, 48].map((size) => ({ size, png: icons[size] })))
    );
    [512, 180, 48, 32, 16].forEach((size) => console.log(`  rendered ${size}x${size} icon (${(icons[size].length / 1024).toFixed(1)}kB)`));

    const card = await shoot(cardHtml(), 1200, 630);
    fs.writeFileSync(path.join(BRAND, 'og-image.png'), card);
    console.log(`  wrote assets/bank/og-image.png (${(card.length / 1024).toFixed(1)}kB)`);
  } finally {
    await browser.close();
  }

  console.log('[brand] done');
})().catch((err) => {
  console.error('[brand] failed:', err);
  process.exit(1);
});
