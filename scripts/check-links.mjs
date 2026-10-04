// Requests every external link in the built site and reports the ones that do not load.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const OWN_SITE = 'https://jasonpereira.live';
// These sites refuse automated requests, so a failure from them says nothing about the link.
const UNCHECKABLE = ['linkedin.com', 'scholar.google.com'];

const htmlFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });

const links = new Set();
for (const file of htmlFiles(DIST)) {
  for (const match of readFileSync(file, 'utf8').matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    links.add(match[1].replaceAll('&amp;', '&'));
  }
}

let failures = 0;
for (const url of [...links].sort()) {
  if (url === OWN_SITE || url.startsWith(`${OWN_SITE}/`)) continue; // this site's own canonical links
  if (UNCHECKABLE.some((host) => new URL(url).hostname.endsWith(host))) {
    console.log(`skipped  ${url}  (blocks automated checks; open it by hand)`);
    continue;
  }
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'Mozilla/5.0 (link check for jasonpereira.live)' },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) {
      console.log(`ok       ${url}`);
    } else {
      failures++;
      console.error(`${response.status}      ${url}`);
    }
  } catch (error) {
    failures++;
    console.error(`failed   ${url}  (${error instanceof Error ? error.message : String(error)})`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} link(s) did not load. A 404 on a GitHub link usually means the repository is private.`);
  process.exit(1);
}
console.log('\nAll checked links load.');
