/*
 * Renders `assets/images/hero-cosmos.png` -- the Dashboard hero's cosmic background layer.
 *
 *   node tools/cosmos/build.mjs
 *
 * The scene is painted in `cosmos.html` on a canvas; this file only sizes it, runs it, and asserts
 * the result is actually a cosmic field rather than a blank or blown-out frame. Those assertions
 * exist because a canvas that fails silently still writes a perfectly valid PNG -- the wordmark
 * generator shipped a serif fallback once for exactly that reason.
 */

import { chromium } from '/Users/thewizard/.npm/_npx/705bc6b22212b352/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const OUT = resolve(ROOT, 'assets/images/hero-cosmos.png');

/*
 * The hero card is ~373x396pt on a 17 Pro and ~411x436pt on a Pro Max -- the same 0.942 aspect, so
 * one asset covers both without distortion. Rendered at 3x the Pro Max width so neither device is
 * ever upscaling.
 */
const WIDTH = 1236;
/*
 * The card's aspect: 373.2pt wide by 396pt tall = 0.9424, from the mockup's border column
 * while the hero was 39pt shorter than the reference. This has to track `heroH` in credit-hero.tsx
 * -- if the two disagree, `contentFit: cover` crops the asset and every measured position in the
 * scene (the planet especially) slides off its mark.
 */
const HEIGHT = Math.round(WIDTH / 0.9424);

const html = readFileSync(resolve(HERE, 'cosmos.html'), 'utf8')
  .replace('WIDTH_PX', String(WIDTH))
  .replace('HEIGHT_PX', String(HEIGHT));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
page.on('pageerror', (e) => { throw e; });
await page.setContent(html);
await page.waitForSelector('html[data-ready="1"]', { timeout: 30_000 });

const buffer = await page.locator('#out').screenshot({ omitBackground: true });
writeFileSync(OUT, buffer);

/* ---- prove the scene actually rendered ---- */
const stats = await page.evaluate(() => {
  const c = document.getElementById('out');
  const ctx = c.getContext('2d');
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let lit = 0, bright = 0, sum = 0, leftSum = 0, leftN = 0, rightSum = 0, rightN = 0;
  const total = c.width * c.height;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
    sum += l;
    if (l > 18) lit += 1;
    if (l > 150) bright += 1;
    const px = (i / 4) % c.width;
    if (px < c.width * 0.45) { leftSum += l; leftN += 1; } else { rightSum += l; rightN += 1; }
  }
  return {
    mean: sum / total,
    litPct: (100 * lit) / total,
    brightPct: (100 * bright) / total,
    leftMean: leftSum / leftN,
    rightMean: rightSum / rightN,
  };
});

await browser.close();

const fail = [];
/* A blank frame would be near zero; a blown-out one would be uniformly high. */
if (stats.mean < 4 || stats.mean > 60) fail.push(`mean luminance ${stats.mean.toFixed(1)} outside 4..60`);
/* Stars and nebula have to cover real area, or the field is empty. */
if (stats.litPct < 8) fail.push(`only ${stats.litPct.toFixed(1)}% of pixels are lit -- field too sparse`);
/* Bright points must exist but must not dominate. */
/* The field is deliberately dark, so the bright fraction is small by design -- this only
   has to catch a field with NO highlights at all. */
if (stats.brightPct < 0.004) fail.push('no bright stars rendered');
if (stats.brightPct > 6) fail.push(`${stats.brightPct.toFixed(1)}% blown out -- scene too hot`);
/* The score sits on the left; it must stay the darker half. */
if (stats.leftMean >= stats.rightMean) fail.push('left half is not darker than the right -- keepout failed');

console.log(`  ${WIDTH}x${HEIGHT}`);
console.log(`  mean=${stats.mean.toFixed(1)}  lit=${stats.litPct.toFixed(1)}%  bright=${stats.brightPct.toFixed(2)}%`);
console.log(`  left mean=${stats.leftMean.toFixed(1)}  right mean=${stats.rightMean.toFixed(1)}  (left must be darker)`);

if (fail.length) {
  console.error('  FAILED:');
  for (const f of fail) console.error(`    - ${f}`);
  process.exit(1);
}
console.log(`  wrote ${OUT.replace(ROOT + '/', '')}`);
