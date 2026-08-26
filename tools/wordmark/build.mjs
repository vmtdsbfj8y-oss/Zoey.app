/**
 * Renders the ZOEY wordmark to a transparent PNG from the project's real Poppins.
 *
 *   node tools/wordmark/build.mjs
 *
 * The whole word is ONE text run, so the letters keep the font's own advances. The previous
 * implementation drew the O as a separate SVG between two Text nodes, which is why it read as
 * "Z <> E Y" -- uneven gaps, and a ring whose weight could never match the letters.
 *
 * Weight and tracking are not chosen by eye. The approved reference measures 203x42px ink at an
 * 853px viewport: a width/cap ratio of 4.833 and a stem/cap of 0.143, which is Poppins SemiBold.
 * The tracking is then solved for numerically until the rendered ratio matches.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/Users/thewizard/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

/** Measured from the approved reference. */
const TARGET_RATIO = 4.833;
const SIZE = 112;   // render size; the asset is downscaled at use
const PAD = 26;     // transparent bleed so the bloom is not clipped
const GLOW = 11;

const font = join(root, 'node_modules/@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf');
const template = readFileSync(join(here, 'wordmark.html'), 'utf8');
const tmp = join(here, '.render.html');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 420 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('  PAGE ERROR:', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.error('  CONSOLE:', m.text()); });

async function measure(track) {
  writeFileSync(tmp, template
    .replaceAll('POPPINS_URL', `file://${font}`)
    .replaceAll('SIZE_PX', String(SIZE))
    .replaceAll('TRACK_PX', String(track))
    .replaceAll('PAD_PX', String(PAD))
    .replaceAll('GLOW_PX', String(GLOW)));
  await page.goto(`file://${tmp}`);
  await page.waitForSelector('html[data-ready="1"]');
  return page.evaluate(() => window.__wordmark);
}

/* Solve for the tracking that reproduces the reference's width/cap ratio. */
let track = 20;
let m = await measure(track);
for (let i = 0; i < 24; i += 1) {
  const ratio = m.ratio;
  if (Math.abs(ratio - TARGET_RATIO) < 0.005) break;
  const needed = TARGET_RATIO * m.ink.height;
  track += (needed - m.ink.width) / 3;      // three gaps carry the difference
  m = await measure(track);
}
/* Guard the failure that just happened: a serif fallback has a very different ratio and a much
   narrower O counter, so both are asserted rather than eyeballed. */
function assertPoppins(m) {
  if (m.letterGroups.length !== 4) throw new Error(`expected 4 letter groups, got ${m.letterGroups.length}`);
  if (m.counter < m.ink.height * 0.35) throw new Error(`O counter ${m.counter.toFixed(1)}px is too small for Poppins -- font fallback?`);
}
assertPoppins(m);

const ratio = m.ratio;
console.log(`  tracking solved: ${track.toFixed(2)}px  ->  ink ${m.ink.width.toFixed(1)} x ${m.ink.height.toFixed(1)} = ratio ${ratio.toFixed(3)} (target ${TARGET_RATIO})`);
console.log(`  asset ${m.file.w}x${m.file.h}, ink left ${m.ink.left}, counter ${m.counter.toFixed(1)}px, star r ${m.starRadius.toFixed(1)}px`);

await page.waitForTimeout(250);
const out = join(root, 'assets/images/zoey-wordmark.png');
await page.locator('#out').screenshot({ path: out, omitBackground: true });
await browser.close();
try { unlinkSync(tmp); } catch {}
console.log(`  wrote ${out}`);
