// Fails while any generated placeholder image is still in use. Run before deploying.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src', 'assets');
const manifest = JSON.parse(readFileSync(join(ROOT, 'placeholders.json'), 'utf8'));

const remaining = Object.entries(manifest)
  .filter(([file, hash]) => {
    const path = join(ROOT, file);
    return existsSync(path) && createHash('sha256').update(readFileSync(path)).digest('hex') === hash;
  })
  .map(([file]) => file);

if (!existsSync(join(process.cwd(), 'public', 'jason-pereira-resume.pdf'))) {
  console.warn('Note: public/jason-pereira-resume.pdf is missing, so the resume page offers no PDF download.');
}

if (remaining.length > 0) {
  console.error(`${remaining.length} placeholder image(s) still in use:`);
  for (const file of remaining) console.error(`  src/assets/${file}`);
  process.exit(1);
}

console.log('No placeholder images remain.');
