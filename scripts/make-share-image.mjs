// Renders the 1200×630 link-preview card to public/og.jpg. Run after `npm run build` (it reuses the built contour art).
// Rerun it whenever the portrait, the name, the first pitch line or the availability line changes.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = process.cwd();
const OUT = join(ROOT, 'public', 'og.jpg');
const require = createRequire(import.meta.url);

// The card uses the same copy as the site. site.yaml is flat enough to read these three values directly.
const siteYaml = readFileSync(join(ROOT, 'src', 'content', 'site.yaml'), 'utf8');
const field = (key) => {
  const match = siteYaml.match(new RegExp(`^  ${key}: (.+)$`, 'm'));
  if (!match) throw new Error(`src/content/site.yaml has no "${key}" line`);
  return match[1].trim();
};
const firstPitchLine = siteYaml.match(/^ {2}pitch:\n {4}- (.+)$/m)?.[1].trim();
if (!firstPitchLine) throw new Error('src/content/site.yaml has no pitch list');
const name = field('name');
const availability = field('availability');

const contours = join(ROOT, 'dist', 'contours.svg');
if (!existsSync(contours)) throw new Error('dist/contours.svg is missing: run `npm run build` first');

// Everything is inlined as data URIs so the page needs no server and no file access.
const dataUri = (path, type) => `data:${type};base64,${readFileSync(path).toString('base64')}`;
const archivo = dataUri(require.resolve('@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2'), 'font/woff2');
const serif = dataUri(
  require.resolve('@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2'),
  'font/woff2',
);
const portrait = dataUri(join(ROOT, 'src', 'assets', 'portrait.png'), 'image/png');
const lines = dataUri(contours, 'image/svg+xml');

const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const [first, ...rest] = name.split(' ');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  @font-face { font-family: Archivo; src: url(${archivo}) format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; }
  @font-face { font-family: Instrument; src: url(${serif}) format('woff2'); font-style: italic; }
  html, body { margin: 0; }
  body {
    position: relative;
    overflow: hidden;
    width: 1200px;
    height: 630px;
    background: #ece7dc;
    color: #121210;
    font-family: Archivo, sans-serif;
  }
  .lines {
    position: absolute;
    inset: -10%;
    background: rgb(18 18 16 / 0.16);
    mask: url(${lines}) center / cover no-repeat;
  }
  /* Flush right, so the cropped shoulder runs off the edge. */
  .portrait { position: absolute; right: 0; bottom: 0; height: 600px; }
  .copy {
    position: absolute;
    top: 60px;
    bottom: 56px;
    left: 64px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .label { margin: 0; font-size: 17px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
  .name { margin: 0; font-size: 104px; font-weight: 900; font-stretch: 125%; line-height: 0.9; text-transform: uppercase; }
  .tag { margin: 22px 0 0; color: #f0440f; font-family: Instrument, serif; font-size: 58px; font-style: italic; line-height: 1; }
</style>
</head>
<body>
  <div class="lines"></div>
  <img class="portrait" src="${portrait}" alt="" />
  <div class="copy">
    <p class="label">jasonpereira.live</p>
    <div>
      <h1 class="name">${escape(first)}<br />${escape(rest.join(' '))}</h1>
      <p class="tag">${escape(firstPitchLine)}</p>
    </div>
    <p class="label">${escape(availability)}</p>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  const fontsLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].every((font) => font.status === 'loaded');
  });
  if (!fontsLoaded) throw new Error('A font failed to load, so the card would render in a fallback face');
  // The name must stay clear of the portrait.
  const overlap = await page.evaluate(() => {
    const name = document.querySelector('.name').getBoundingClientRect();
    const portrait = document.querySelector('.portrait').getBoundingClientRect();
    return name.right > portrait.left + portrait.width * 0.2;
  });
  if (overlap) throw new Error('The name runs into the portrait; shorten it or reduce .name font-size');
  await page.screenshot({ path: OUT, type: 'jpeg', quality: 86 });
  console.log(`wrote public/og.jpg (${Math.round(readFileSync(OUT).length / 1024)} KB)`);
} finally {
  await browser.close();
}
