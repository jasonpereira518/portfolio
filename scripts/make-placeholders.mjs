// Creates clearly marked placeholder images at the paths the site expects.
// Existing files are never overwritten: drop a real image at the same path and it is kept.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const ROOT = join(process.cwd(), 'src', 'assets');
const MANIFEST = join(ROOT, 'placeholders.json');
const PAPER = '#ECE7DC';
const INK = '#121210';
const ORANGE = '#FF5A26';

const text = (x, y, size, value, fill) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${size}" fill="${fill}">${value}</text>`;

const portrait = (w, h) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <circle cx="${w / 2}" cy="${h * 0.34}" r="${w * 0.2}" fill="${INK}"/>
  <path d="M${w * 0.06} ${h} C${w * 0.06} ${h * 0.68} ${w * 0.3} ${h * 0.6} ${w / 2} ${h * 0.6} C${w * 0.7} ${h * 0.6} ${w * 0.94} ${h * 0.68} ${w * 0.94} ${h} Z" fill="${INK}"/>
  ${text(w / 2, h * 0.84, w / 22, 'PLACEHOLDER PORTRAIT', PAPER)}
</svg>`;

const card = (w, h, value, background, foreground) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${background}"/>
  <circle cx="${w * 0.82}" cy="${h * 0.24}" r="${Math.min(w, h) * 0.12}" fill="${ORANGE}"/>
  ${text(w / 2, h / 2, w / 20, value, foreground)}
</svg>`;

const covers = ['case-closed', 'orbit', 'streetlab', 'gpu-portfolio-engine'];
const photos = [
  [900, 1200],
  [1200, 900],
  [1000, 1000],
  [900, 1200],
  [1200, 800],
  [1000, 1250],
];

const jobs = [
  { file: 'portrait.png', svg: portrait(1200, 1500), format: 'png' },
  ...covers.map((slug) => ({
    file: `work/${slug}.png`,
    svg: card(1600, 1000, `PLACEHOLDER: ${slug.toUpperCase()}`, INK, PAPER),
    format: 'png',
  })),
  ...photos.map(([w, h], index) => ({
    file: `collage/0${index + 1}.jpg`,
    svg: card(w, h, `PLACEHOLDER PHOTO 0${index + 1}`, '#D9D2C3', INK),
    format: 'jpeg',
  })),
];

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};

for (const job of jobs) {
  const target = join(ROOT, job.file);
  if (existsSync(target)) {
    // A file that no longer matches its recorded hash is a real asset: stop tracking it.
    if (manifest[job.file] && manifest[job.file] !== sha(target)) delete manifest[job.file];
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  const image = sharp(Buffer.from(job.svg));
  await (job.format === 'png' ? image.png() : image.jpeg({ quality: 82 })).toFile(target);
  manifest[job.file] = sha(target);
  console.log(`created placeholder src/assets/${job.file}`);
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${Object.keys(manifest).length} placeholder(s) recorded in src/assets/placeholders.json`);
