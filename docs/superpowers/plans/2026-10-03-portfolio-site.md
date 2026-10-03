# Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Jason Pereira's portfolio site: a fast, static, editorial site with a paint-wash hero interaction, seven home sections, a work index, four case studies, a resume page and a 404.

**Architecture:** Astro builds every page to static HTML and CSS. All copy lives in `src/content/` and is validated against schemas at build time. Three small vanilla TypeScript modules (hero paint wash, showcase tabs, number count-up) are loaded only when their section nears the viewport; everything else is CSS. Logic that can be reasoned about without a browser lives in `src/lib/` as pure functions with unit tests; behaviour that needs a browser is covered by Playwright against the built site.

**Tech Stack:** Astro 7, TypeScript 6, Vitest 5, Playwright, Lenis (smooth scroll), Fontsource font files, d3-contour and simplex-noise (build time only), sharp (placeholder images), Vercel static hosting.

**Specs:** `docs/superpowers/specs/2026-10-03-portfolio-design.md` (design) and `docs/superpowers/specs/2026-10-03-portfolio-content.md` (copy and data). Executors read both.

## Global Constraints

- **Versions (verified on npm, 3 Oct 2026):** `astro@^7.3.5`, `typescript@^6.0.3` (not 7: `@astrojs/check` accepts only `^5 || ^6`), `vitest@^5.0.3`, `@playwright/test@^1.63.0`, `lenis@^1.3.26`, Node `>=22.12.0` (this machine runs 24.19).
- **Runtime dependencies are limited to:** `astro`, `lenis`, `@fontsource-variable/archivo`, `@fontsource/instrument-serif`. No React, no WebGL, no three.js, no GSAP.
- **Astro 7 rules:** every non-void tag must be closed (the Rust compiler rejects unclosed tags); `compressHTML: true` is set so spaces between inline elements survive; import `z` from `astro/zod` (Zod 4); never create `src/fetch.ts` (reserved name).
- **Colour:** paper `#ECE7DC`, ink `#121210`, orange `#FF5A26` on ink and `#F0440F` on paper. Orange is for large type, lines and fills only; small text is always ink or paper.
- **Type:** exactly two font files: Archivo variable (`archivo-latin-wdth-normal.woff2`) and Instrument Serif italic (`instrument-serif-latin-400-italic.woff2`).
- **No computer-science visual motifs:** no code or terminal styling, no data-structure or algorithm imagery, no monospace type.
- **Budget:** home page first load ≤ 600 KB transferred, JavaScript ≤ 50 KB compressed, Lighthouse mobile performance ≥ 95, LCP < 2.0 s, CLS < 0.05.
- **Accessibility:** all content readable with JavaScript disabled; canvases are decorative and `aria-hidden`; full keyboard access; visible focus; `prefers-reduced-motion: reduce` gives static pages.
- **Copy:** use only text from the content spec. Its rules apply to every string: AWS work high-level, "senior leaders" not "VP-level", 4 agents not 5, no UNC GPA, no phone number, graduation May 2028, teammates not named.
- **Git:** work on branch `site-v1`. Every task ends with a commit. End every commit message with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- **Deploying and domain changes need Jason's explicit go-ahead** (Task 16).

## How this plan differs from the design spec

Small, deliberate simplifications. Nothing visible changes.

- The contour background and the collage parallax are pure CSS, so the spec's `contour` and `collage` script modules are not needed. Three script modules remain: `hero-wash` (the spec called it `hero-reveal`), `showcase`, `numbers`.
- The self-drawing signature beside the marquee is left out until Jason supplies a signature file (see "Not in this plan").
- Case-study galleries render whatever images exist in `src/assets/work/<slug>/`; with none, the gallery is omitted.
- The first "number" is `220+` with a caption naming the 1st-place finish, so every giant numeral is short enough to be giant (the content spec was updated to match).

## File Structure

```
.gitignore  .nvmrc  package.json  astro.config.mjs  tsconfig.json
vitest.config.ts  playwright.config.ts  vercel.json  README.md
public/
  favicon.svg  robots.txt
scripts/
  make-placeholders.mjs     generates clearly marked placeholder images
  check-assets.mjs          fails while any placeholder image is still in use
  check-links.mjs           checks every external link in the built site
src/
  content.config.ts         collection schemas
  content/
    site.yaml  numbers.yaml  experience.yaml  education.yaml  about.yaml  resume.yaml
    projects/*.md           17 projects (4 flagship with case-study body)
  assets/
    portrait.png  work/*.png  collage/*.jpg  placeholders.json
  styles/
    tokens.css              colours, type, spacing, themes
    global.css              reset, shared classes, reveal and fit rules
  lib/                      pure logic, unit tested
    clock.ts  content.ts  asset-lookup.ts  assets.ts  resume-pdf.ts
    contours.ts  wash.ts  statement.ts  tabs.ts  count.ts
  scripts/                  browser entry points
    main.ts                 js flag, clock, text fitting, reveal, island loader, smooth scroll
    hero-wash.ts  showcase.ts  numbers.ts  smooth.ts
  layouts/Base.astro
  components/
    Nav.astro  Button.astro  ContourBg.astro  ProjectCard.astro
    sections/Hero.astro  Statement.astro  Work.astro  Numbers.astro
             Experience.astro  About.astro  Contact.astro
  pages/
    index.astro  404.astro  resume.astro  contours.svg.ts
    work/index.astro  work/[slug].astro
tests/
  unit/*.test.ts            Vitest, Node environment
  e2e/*.spec.ts             Playwright against `astro preview`
```

Every script module in `src/scripts/` that is loaded lazily exports one function: `mount(el: HTMLElement): void`.

---

### Task 1: Toolchain and first page

**Files:**
- Create: `.gitignore`, `.nvmrc`, `package.json`, `tsconfig.json`, `astro.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `public/favicon.svg`, `public/robots.txt`, `src/lib/clock.ts`, `src/pages/index.astro`
- Test: `tests/unit/clock.test.ts`, `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `formatClock(date: Date, timeZone: string, label: string): string` in `src/lib/clock.ts`; npm scripts `dev`, `build`, `preview`, `check`, `test`, `test:e2e`, `verify`.

- [ ] **Step 1: Create the working branch**

```bash
git switch -c site-v1
```

- [ ] **Step 2: Write the project configuration files**

`.gitignore`:

```
node_modules/
dist/
.astro/
.vercel/
test-results/
playwright-report/
lighthouse.json
.DS_Store
.env
.env.*
```

`.nvmrc`:

```
24
```

`package.json`:

```json
{
  "name": "jason-pereira-portfolio",
  "type": "module",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "verify": "npm run check && npm run test && npm run build && npm run test:e2e"
  },
  "dependencies": {
    "@fontsource-variable/archivo": "^5.3.0",
    "@fontsource/instrument-serif": "^5.3.0",
    "astro": "^7.3.5",
    "lenis": "^1.3.26"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.10",
    "@playwright/test": "^1.63.0",
    "@types/d3-contour": "^3.0.6",
    "@types/node": "^24.0.0",
    "d3-contour": "^4.0.2",
    "sharp": "^0.35.5",
    "simplex-noise": "^4.0.3",
    "typescript": "^6.0.3",
    "vitest": "^5.0.3"
  }
}
```

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

`astro.config.mjs`:

```js
// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  site: 'https://jasonpereira.live',
  // Astro 7 defaults to JSX-style whitespace stripping; this keeps the spaces between inline elements.
  compressHTML: true,
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Archivo',
      cssVariable: '--font-archivo',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          {
            src: ['@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2'],
            weight: '100 900',
            stretch: '62% 125%',
            style: 'normal',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Instrument Serif',
      cssVariable: '--font-instrument',
      fallbacks: ['serif'],
      options: {
        variants: [
          {
            src: ['@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2'],
            weight: 400,
            style: 'italic',
          },
        ],
      },
    },
  ],
});
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321/',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#121210"/><circle cx="16" cy="16" r="7" fill="#FF5A26"/></svg>
```

`public/robots.txt`:

```
User-agent: *
Allow: /
```

- [ ] **Step 3: Install dependencies and the test browser**

```bash
npm install
npx playwright install chromium
```

Expected: `npm install` finishes with no `ERESOLVE` errors; Playwright reports Chromium downloaded (about 150 MB, one time).

- [ ] **Step 4: Write the failing unit test**

`tests/unit/clock.test.ts`:

```ts
import { expect, test } from 'vitest';
import { formatClock } from '../../src/lib/clock';

test('formats the time in the given zone as 24-hour HH:MM plus a label', () => {
  expect(formatClock(new Date('2026-10-03T19:34:00Z'), 'America/New_York', 'ET')).toBe('15:34 ET');
});

test('follows daylight saving changes for the zone', () => {
  expect(formatClock(new Date('2026-01-15T17:05:00Z'), 'America/New_York', 'ET')).toBe('12:05 ET');
});

test('pads midnight as 00, never 24', () => {
  expect(formatClock(new Date('2026-10-03T04:07:00Z'), 'America/New_York', 'ET')).toBe('00:07 ET');
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npm run test`
Expected: FAIL, the import of `../../src/lib/clock` cannot be resolved.

- [ ] **Step 6: Implement the clock**

`src/lib/clock.ts`:

```ts
/** "15:34 ET": the time in `timeZone`, 24-hour, followed by a short zone label. */
export function formatClock(date: Date, timeZone: string, label: string): string {
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${time} ${label}`;
}
```

- [ ] **Step 7: Run the unit tests to verify they pass**

Run: `npm run test`
Expected: PASS, 3 tests.

- [ ] **Step 8: Write the failing end-to-end test**

`tests/e2e/home.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('home page shows the name as the main heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Jason Pereira' })).toBeVisible();
});
```

- [ ] **Step 9: Run it to verify it fails**

Run: `npm run build && npm run test:e2e`
Expected: FAIL, no page is served at `/` so the heading is never found.

- [ ] **Step 10: Add the first page**

`src/pages/index.astro`:

```astro
---
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Jason Pereira</title>
  </head>
  <body>
    <h1>Jason Pereira</h1>
  </body>
</html>
```

- [ ] **Step 11: Run the whole verification chain**

Run: `npm run verify`
Expected: `astro check` reports 0 errors, Vitest 3 passed, the build completes, Playwright 1 passed.

- [ ] **Step 12: Commit**

```bash
git add .gitignore .nvmrc package.json package-lock.json tsconfig.json astro.config.mjs vitest.config.ts playwright.config.ts public src tests
git commit -m "chore: scaffold Astro project with unit and end-to-end test runners" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Content collections and all site copy

**Files:**
- Create: `src/content.config.ts`, `src/lib/content.ts`, `src/content/site.yaml`, `src/content/numbers.yaml`, `src/content/experience.yaml`, `src/content/education.yaml`, `src/content/about.yaml`, `src/content/resume.yaml`, and 17 files in `src/content/projects/`
- Modify: `src/pages/index.astro`
- Test: `tests/unit/content-rules.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, all from `src/lib/content.ts`:
  - `getSite()`, `getAbout()`, `getResume()`: resolve to the `data` object of the single `main` entry.
  - `getNumbers()`, `getExperience()`, `getEducation()`, `getProjects()`: resolve to entries sorted by `data.order`.
  - `getFlagship(): Promise<Flagship[]>`, where `Flagship` is a project entry whose `data.cover`, `data.problem` and `data.result` are guaranteed strings.
  - `getCardsByGroup(): Promise<{ group: CardGroup; label: string; projects: CollectionEntry<'projects'>[] }[]>`.
  - A project's `id` is its file name without `.md` (for example `case-closed`) and is its URL slug.

- [ ] **Step 1: Write the failing copy-rules test**

`tests/unit/content-rules.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const CONTENT = join(process.cwd(), 'src', 'content');
const read = (...parts: string[]) => readFileSync(join(CONTENT, ...parts), 'utf8');
const dataFiles = ['site.yaml', 'numbers.yaml', 'experience.yaml', 'education.yaml', 'about.yaml', 'resume.yaml'];
const projectFiles = readdirSync(join(CONTENT, 'projects')).filter((file) => file.endsWith('.md'));
const everything: [string, string][] = [
  ...dataFiles.map((file): [string, string] => [file, read(file)]),
  ...projectFiles.map((file): [string, string] => [`projects/${file}`, read('projects', file)]),
];

describe('content inventory', () => {
  test('there are 17 projects and exactly 4 are flagship', () => {
    expect(projectFiles).toHaveLength(17);
    const flagship = projectFiles.filter((file) => /^kind: flagship$/m.test(read('projects', file)));
    expect(flagship.sort()).toEqual(['case-closed.md', 'gpu-portfolio-engine.md', 'orbit.md', 'streetlab.md']);
  });

  test('graduation is May 2028', () => {
    expect(read('site.yaml')).toContain('graduation: May 2028');
    expect(read('education.yaml')).toContain('May 2028');
  });
});

describe('copy rules from the content spec', () => {
  const banned: [RegExp, string][] = [
    [/VP-level/i, 'say "senior leaders"'],
    [/5-agent/i, 'the AWS app has 4 agents'],
    [/12\+ years/i, 'Scouting was 11 years to the rank'],
    [/for an AWS customer/i, 'the ad-copy scenario was hypothetical'],
    [/deployed to production/i, 'nothing at AWS was deployed to production'],
    [/YOLOv5/i, 'the work used YOLOv3'],
    [/\(\d{3}\)\s*\d{3}-\d{4}/, 'no phone number on the site'],
    [/May 2027/, 'graduation is May 2028'],
  ];

  test.each(everything)('%s avoids banned phrases', (_file, text) => {
    for (const [pattern, reason] of banned) expect(text, reason).not.toMatch(pattern);
  });

  test('GPA appears once, for CPCC only', () => {
    for (const [file, text] of everything) {
      if (file === 'education.yaml') {
        expect(text.match(/GPA/g)).toHaveLength(1);
        expect(text).toContain('4.0 GPA');
      } else {
        expect(text, file).not.toMatch(/GPA/);
      }
    }
  });

  test('Brain Bubble Pop is not described as AI-powered', () => {
    expect(read('projects', 'brain-bubble-pop.md')).not.toMatch(/AI-powered/i);
  });

  test('Intelitrade carries no landing-page figures or link', () => {
    expect(read('projects', 'intelitrade.md')).not.toMatch(/base44|127 investors|\$847/i);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test`
Expected: FAIL with `ENOENT`, `src/content/projects` does not exist.

- [ ] **Step 3: Write the single-entry data files**

`src/content/site.yaml`:

```yaml
main:
  name: Jason Pereira
  description: Jason Pereira is an AI engineer who ships. CS and Statistics at UNC-Chapel Hill, former AWS Solutions Architect intern, and co-founder of Case Closed.
  location: Chapel Hill, NC
  timezone: America/New_York
  timezoneLabel: ET
  availability: Open to Summer 2027 internships
  graduation: May 2028
  email: jasonpereira518@gmail.com
  links:
    linkedin: https://linkedin.com/in/jasonpereira518
    github: https://github.com/jasonpereira518
    scholar: https://scholar.google.com/citations?user=qDR0TFwAAAAJ
  pitch:
    - AI engineer who ships.
    - CS + Statistics at UNC-Chapel Hill.
    - Former AWS Solutions Architect intern.
    - Co-founder of Case Closed.
  statement: I build AI systems that *ship*. I start with the *people* who will use them, *measure* before I claim, and make the *business case* myself.
  marquee: Direction *before* speed
```

In `statement` and `marquee`, words wrapped in `*asterisks*` are the serif, orange accent words.

`src/content/about.yaml`:

```yaml
main:
  heading: I'm Jason.
  bio: "I'm a junior at UNC-Chapel Hill studying Computer Science and Statistics & Analytics, with a Business minor. Last summer I was a Solutions Architect intern at AWS. I co-founded Case Closed, an AI litigation workspace that began as a 36-hour hackathon build and is now in early access with attorneys testing it. I like going below the abstraction, measuring before I claim, and building things people actually use."
  facts:
    - Eagle Scout with Gold and Bronze Palms. Over a decade in Scouting.
    - "TEDxUNC speaker: “The Velocity Paradox”, February 2026."
    - Published co-author of NSF-supported research (TEEM, 2026).
    - Co-designed CAT-45, Carolina Skylab's first in-house rocket motor.
  interests:
    - Tennis
    - Hiking and camping
    - Flying
    - Rocketry
    - Hip-hop and playlist curation
    - Hackathons
  collage:
    - file: 01.jpg
    - file: 02.jpg
    - file: 03.jpg
    - file: 04.jpg
    - file: 05.jpg
    - file: 06.jpg
```

Collage entries get a `caption` (place and year) when Jason's real photos arrive in Task 15; placeholders carry none.

`src/content/resume.yaml`:

```yaml
main:
  skills:
    - label: Languages
      items: Python, TypeScript, JavaScript, Java, C++, C, Rust, OCaml, Swift, SQL, Bash
    - label: Frameworks
      items: React, Next.js, Node.js, FastAPI, Flask, SwiftUI, Tauri, Three.js, Tailwind CSS
    - label: AI and ML
      items: PyTorch, TensorFlow/Keras, Hugging Face, scikit-learn, XGBoost, Amazon Bedrock (AgentCore, Knowledge Bases, Guardrails), Vertex AI, LangChain, RAG, FAISS, pgvector, MCP
    - label: Data and infrastructure
      items: PostgreSQL, DynamoDB, MongoDB, Firebase/Firestore, Supabase, AWS, GCP, Docker, Kubernetes, CI/CD, Git, Linux
  certifications:
    - AWS Certified Solutions Architect – Associate
    - AWS Certified Machine Learning Engineer – Associate
    - AWS Certified AI Practitioner
    - AWS Certified Cloud Practitioner
    - Google Generative AI Leader
    - Duke Machine Learning Foundations for Product Managers
  awards:
    - 1st place, Duke AI Hackathon (Nov 2025)
    - 1st place, Anthropic Claude AI Hackathon (Nov 2025)
    - 1st place, Tminus0 Startup Challenge
    - Final showcase invite, AWS Global AI Expo Challenge (2026)
    - UNC 1789 Student Venture Fund recipient (Mar 2026)
    - Robert E. Bryan Fellow
    - Selected for Y Combinator Startup School 2026 (San Francisco, Jul 25–26)
    - Charlotte's 20 Under 20 (Jan 2026)
    - TEDxUNC speaker (Feb 2026)
    - Eagle Scout (Oct 2024)
  publication:
    citation: "Adala, V., Jun, T., Pereira, J., Sandwar, V., & Fernandes, A. (2026). Analyzing Real Traffic Stop Data for Racial Bias. Teaching for Excellence and Equity in Mathematics, 17(1), 32–43."
    url: https://doi.org/10.63966/teem.v17i1.2265
```

- [ ] **Step 4: Write the list data files**

`src/content/numbers.yaml`:

```yaml
- id: hackathon
  order: 1
  numeral: 220+
  caption: competitors at the Duke AI Hackathon, where Case Closed placed 1st (November 2025)
- id: interviews
  order: 2
  numeral: 60+
  caption: Solutions Architects interviewed at AWS before building
- id: opinions
  order: 3
  numeral: 9M+
  caption: court opinions Case Closed searches
- id: tests
  order: 4
  numeral: 1,100+
  caption: automated tests in StreetLab
- id: certifications
  order: 5
  numeral: "4"
  caption: AWS certifications, earned in six weeks during the internship
```

`src/content/experience.yaml`:

```yaml
- id: aws
  order: 1
  org: Amazon Web Services
  role: Solutions Architect Intern
  place: Arlington, VA
  dates: May–Aug 2026
  summary: "Built a serverless 4-agent generative AI app on Amazon Bedrock AgentCore, and co-led Quick Sprint Demo Packs: 60+ SAs interviewed, greenlit by senior leaders in New York, all five industry packs built and handed off."
- id: cig
  order: 2
  org: Carolina Investment Group
  role: Director of Technology
  place: Chapel Hill, NC
  dates: Sep 2026–present
  summary: "Lead five engineers building the internal platform for a 35-member investment group; own the roadmap and review all contributions."
- id: arthmetis
  order: 3
  org: Arthmetis
  role: Artificial Intelligence Intern
  place: Charlotte, NC
  dates: Jun–Aug 2025
  summary: "Built a hybrid LLM and ML retail recommendation engine on 50K+ real customer-product interactions, lifting top-3 precision 25% over semantic search alone."
- id: uncc
  order: 4
  org: UNC Charlotte, Dept. of Mathematics & Statistics
  role: Data Science Researcher
  place: Charlotte, NC
  dates: Feb 2024–May 2026
  summary: "Published co-author of NSF-supported research analysing a 5,000-stop sample of ~124,000 Charlotte traffic stops (TEEM, 2026)."
- id: inspirit
  order: 5
  org: Inspirit AI
  role: AI Scholar Intern
  dates: May 2023–Dec 2024
  summary: "Fine-tuned BERT to 97.36% test accuracy on financial-news sentiment, and built road-object detection from a perceptron up to YOLOv3."
```

`src/content/education.yaml`:

```yaml
- id: unc
  order: 1
  school: University of North Carolina at Chapel Hill
  detail: "B.S. Computer Science · B.S. Statistics & Analytics · Minor in Business · Honors Carolina"
  dates: Graduating May 2028
- id: cpcc
  order: 2
  school: Central Piedmont Community College
  detail: "Associate in Arts (dual enrollment) · 4.0 GPA"
  dates: Completed July 2025
```

- [ ] **Step 5: Write the four flagship project files**

`src/content/projects/case-closed.md`:

```md
---
title: Case Closed
short: Case Closed
tagline: AI litigation workspace
kind: flagship
group: flagship
order: 1
role: "Co-founder. Front end and UI/UX, contributing across backend and AI; customer discovery and fundraising."
dates: Nov 2025–present
status: Live in early access; attorneys testing
summary: "Keeps a case's record, research, analysis and first draft connected for solo and small-firm litigators."
proof:
  - 1st of 220+ at the Duke AI Hackathon
  - Searches 9M+ court opinions
  - Backed by UNC's 1789 Student Venture Fund
stack:
  - Python
  - Flask
  - Google Gemini via Vertex AI
  - CourtListener API
  - Firestore
  - Cloud Run and Cloud Tasks
  - Cloud Vector Search
  - Document AI
  - Clerk
  - Docker
links:
  - label: Live site
    href: https://caseclosed.jasonpereira.live
  - label: Product tour
    href: https://youtu.be/-iNLur6breI
  - label: Repo
    href: https://github.com/jasonpereira518/caseclosed
cover: case-closed.png
problem: "Solo and small-firm litigators spread a case across six tools, so the record, research, analysis and first draft never stay connected."
result: "Built in 36 hours and placed 1st of 220+ competitors at the Duke AI Hackathon (Nov 2025), judged by 34+ professors and industry judges. Accepted into UNC's 1789 Student Venture Fund in March 2026. Now live in early access."
---

A matter-aware workspace. Add the record (PDF, DOCX, DOC, TXT) and it extracts facts, parties, a chronology and legal issues. It researches authority across 9M+ court opinions, returning each result with its citation, jurisdiction, a relevance explanation and a fit score. Then it prepares an editable memo or brief.

Every citation must resolve to retrieved material, and the lawyer reviews everything.
```

`src/content/projects/orbit.md`:

```md
---
title: Orbit
short: Orbit
tagline: Networking intelligence platform
kind: flagship
group: flagship
order: 2
role: Solo build
dates: Jul 2026–present
status: Live prototype; used by me and a few pilot testers
summary: "A personal networking CRM for a job search: who you know, how warm they are, and who is drifting."
proof:
  - 466 commits
  - Exposes an MCP server
  - Free for the first 500 contacts
stack:
  - Next.js 16
  - React 19
  - TypeScript
  - Tailwind
  - shadcn/ui
  - Drizzle ORM
  - Neon Postgres
  - pgvector
  - Clerk
  - Stripe
  - Playwright
  - Vercel
links:
  - label: Live site
    href: https://orbit.jasonpereira.live
  - label: Repo
    href: https://github.com/jasonpereira518/orbit
cover: orbit.png
problem: "After events and coffee chats I couldn't remember who I'd met or what we'd discussed, so warm connections went cold before they turned into anything."
result: "466 commits. A working prototype in use by me and a small group of pilot testers, demoed at a UNC CS Founded showcase table, with end-to-end tests, per-page performance budgets, CI and error monitoring."
---

Paste raw notes and AI pulls out contacts, companies and context. Imports from LinkedIn, address books, calendar and Gmail are deduplicated into one record per person.

An interactive map clusters people by company and school, a chat answers questions over your own network, and follow-up cadences flag who is drifting. It also exposes an MCP server and ships a browser extension.
```

`src/content/projects/streetlab.md`:

```md
---
title: StreetLab
short: StreetLab
tagline: Self-driving simulator
kind: flagship
group: flagship
order: 3
role: Solo build
dates: Aug 2026–present
status: Cycles 1–5 built; still active
summary: "Point it at any real address and a simulated car drives the actual streets, obeying signals and reacting to traffic."
proof:
  - 1,100+ automated tests
  - 30–60 FPS in WebGPU
  - Built in 5 cycles
stack:
  - Rust
  - Tauri 2
  - TypeScript
  - React
  - Three.js over WebGPU
  - Python
  - FastAPI WebSockets
  - ONNX Runtime
  - OpenStreetMap
links:
  - label: Repo
    href: https://github.com/jasonpereira518/streetlab
cover: streetlab.png
problem: "I wanted to go deep on real-time graphics, deterministic simulation and applied ML as a system rather than a notebook, and to treat every performance claim as something to measure. It is a portfolio and learning project, not a production AV system."
result: "1,100+ automated tests, all green (910 backend, 205 frontend, 12 end-to-end). 30–60 FPS in the WebGPU viewport. Built in five cycles, each added without touching the earlier ones."
---

A native desktop app that geocodes any real address, pulls actual street and building geometry from OpenStreetMap, and drives a simulated car through it, obeying traffic lights and stop signs and reacting to other traffic.

Every message between the simulation and the UI is validated against one schema on both sides.
```

`src/content/projects/gpu-portfolio-engine.md`:

```md
---
title: GPU Portfolio & Risk Decision Engine
short: GPU Portfolio Engine
tagline: Portfolio optimizer, built twice
kind: flagship
group: flagship
order: 4
role: Solo build
dates: Jul/Aug 2026–present
status: Built; CPU and GPU paths committed
summary: "A portfolio optimizer built twice, on CPU and GPU, with a parity suite proving both give the same answer."
proof:
  - QP solve 2.48–2.66× faster at 3,000 assets
  - Parity to 1e-6
  - 100+ tests
stack:
  - Python
  - RAPIDS cuDF and cuML
  - NVIDIA cuOpt
  - CVXPY and Clarabel
  - pandas
  - Docker
links:
  - label: Repo
    href: https://github.com/jasonpereira518/gpu-portfolio-optimization-engine
cover: gpu-portfolio-engine.png
problem: "GPU speedups are easy to inflate with a slow baseline. I wanted to know where a GPU actually pays off in portfolio optimization."
result: "The QP solve is 2.48–2.66× faster on GPU at 3,000 assets (5.96 s to 2.41 s), with the crossover between 500 and 3,000 assets and parity to 1e-6. Lot rounding beat the greedy baseline in 18 of 18 cases. Only the solve stage wins on GPU; I don't claim an end-to-end speedup."
---

A mean-variance optimizer built twice, once on CPU and once on GPU, sharing one interface. A parity suite proves both paths give the same answer before any timing is trusted, and a benchmark harness times each stage separately.

It includes three risk models, lot rounding with transaction costs, and a backtest with no lookahead.
```

- [ ] **Step 6: Write the thirteen card project files**

These have frontmatter only (no body). Each goes in `src/content/projects/`.

`limit-order-book.md`:

```md
---
title: Limit Order Book & Matching Engine
short: Order book
tagline: OCaml matching engine
kind: card
group: quant
order: 10
role: Solo build
status: Built and benchmarked
summary: "Price-time-priority matching engine on Jane Street's Core stack, with invariants enforced by property-based tests. ~1.6M events/sec and ~2–3 µs p99 on synthetic flow."
links:
  - label: Repo
    href: https://github.com/jasonpereira518/limit-order-book
---
```

`deltahedge.md`:

```md
---
title: DeltaHedge
short: DeltaHedge
tagline: Risk desk for prediction markets
kind: card
group: quant
order: 11
role: Data and quant side
dates: Jan 2026
status: Hackathon prototype, NexHacks (Carnegie Mellon)
summary: "A risk and hedging desk for prediction markets: correlation across 200+ markets and beta-adjusted hedges. I built the data and quant side."
links:
  - label: Devpost
    href: https://devpost.com/software/polymarket-risk-desk
  - label: Repo
    href: https://github.com/sairit/deltahedge
---
```

`intelitrade.md`:

```md
---
title: Intelitrade
short: Intelitrade
tagline: Portfolio intelligence for retail investors
kind: card
group: quant
order: 12
role: Technical co-founder
dates: Jan 2026–present
status: MVP
summary: "AI portfolio intelligence for retail investors: hidden trading costs, news impact and concentration risk."
---
```

`hacknc.md`:

```md
---
title: HackNC 2026
short: HackNC
tagline: Hackathon website and participant portal
kind: card
group: fullstack
order: 20
role: HackNC Development Committee
dates: "2026"
status: Site shipped; portal in progress
summary: "Site and participant platform for UNC's ~500-person hackathon: landing page, auth, schedule, notifications and meals."
links:
  - label: Live site
    href: https://hacknc.com
---
```

`p2p-live.md`:

```md
---
title: P2P Live
short: P2P Live
tagline: Live transit interface
kind: card
group: fullstack
order: 21
role: Co-built
dates: "2026"
status: Deployed preview
summary: "A live transit interface for UNC's late-night Point-to-Point buses, with a rider view and an operations dashboard."
links:
  - label: Live preview
    href: https://p2pnow.netlify.app/
  - label: Repo
    href: https://github.com/jasonpereira518/p2p-live
---
```

`ethics-bowl-academy.md`:

```md
---
title: Ethics Bowl Academy
short: Ethics Bowl Academy
tagline: Ethics-education platform
kind: card
group: fullstack
order: 22
role: CS + Social Good project team
dates: Spring 2026
status: Shipped, live
summary: "An online ethics-education platform of interactive modules for the UNC Parr Center for Ethics, with TED-Ed. I built authentication, protected routes, module components and progress tracking."
links:
  - label: Live site
    href: https://ethicsbowlacademy.org
  - label: Repo
    href: https://github.com/cssgunc/Ethics-Bowl-Academy
---
```

`carolina-corner.md`:

```md
---
title: Carolina Corner
short: Carolina Corner
tagline: Storytelling booth and archive
kind: card
group: fullstack
order: 23
role: Co-founder, Robert E. Bryan Fellowship
dates: Nov 2025–present
status: Web prototype complete; booth build pending
summary: "A storytelling booth and digital archive for the UNC community: pick a prompt, record a video, receive it by email."
links:
  - label: Live site
    href: https://carolinacorner.com
  - label: Repo
    href: https://github.com/jasonpereira518/carolina-corner
---
```

`pauli-murray-tour.md`:

```md
---
title: Pauli Murray Center Interactive Tour
short: Pauli Murray tour
tagline: Interactive web tour
kind: card
group: fullstack
order: 24
role: CS + Social Good project team
dates: "2026"
status: Live and in use by the client
summary: "An interactive web tour of civil rights pioneer Pauli Murray's childhood home, with student and teacher paths."
---
```

`leet-streak.md`:

```md
---
title: Leet Streak
short: Leet Streak
tagline: Daily LeetCode accountability
kind: card
group: mobile
order: 30
role: App Team Carolina iOS apprenticeship capstone
dates: Sept 2025
status: Built and demoed
summary: "A social accountability app for a daily LeetCode habit, built in Swift and SwiftUI."
---
```

`flowtrack.md`:

```md
---
title: FlowTrack
short: FlowTrack
tagline: Subscription tracker
kind: card
group: mobile
order: 31
role: Personal iOS app
dates: Nov 2024
status: Built, open source
summary: "A subscription tracker that puts recurring payments on one dashboard."
links:
  - label: Repo
    href: https://github.com/jasonpereira518/FlowTrack
---
```

`brain-bubble-pop.md`:

```md
---
title: Brain Bubble Pop
short: Brain Bubble Pop
tagline: Stress-relief study game
kind: card
group: hackathon
order: 40
role: Team of 2
dates: Nov 2025
status: 1st place, Anthropic Claude AI Hackathon
summary: "A stress-relief study game built around a Pomodoro timer, in a single ~650-line HTML, CSS and JavaScript file."
links:
  - label: Repo
    href: https://github.com/jasonpereira518/BrainBubblePop
---
```

`project-goldilocks.md`:

```md
---
title: Project Goldilocks
short: Project Goldilocks
tagline: Exoplanet habitability scoring
kind: card
group: hackathon
order: 41
role: Carolina Data Challenge team
dates: Sep 2025
status: Hackathon build
summary: "Habitability scoring over the NASA Exoplanet Archive from first-principles astrophysics; recovered Kepler's Third Law at R² = 0.84."
links:
  - label: Repo
    href: https://github.com/jasonpereira518/project-goldilocks
---
```

`cat-45.md`:

```md
---
title: CAT-45
short: CAT-45
tagline: Solid rocket motor
kind: card
group: hardware
order: 50
role: Carolina Skylab Rocket Team, co-designer
dates: Dec 2025–present
status: Designed and built; static fire pending
summary: "A small solid-propellant rocket motor designed from classical propulsion theory: 320 N·s total impulse at 500 psi chamber pressure."
---
```

- [ ] **Step 7: Define the collection schemas**

`src/content.config.ts`:

```ts
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    short: z.string(),
    tagline: z.string(),
    kind: z.enum(['flagship', 'card']),
    group: z.enum(['flagship', 'quant', 'fullstack', 'mobile', 'hackathon', 'hardware']),
    order: z.number().int(),
    role: z.string(),
    dates: z.string().optional(),
    status: z.string(),
    summary: z.string(),
    proof: z.array(z.string()).default([]),
    stack: z.array(z.string()).default([]),
    links: z.array(z.object({ label: z.string(), href: z.url() })).default([]),
    cover: z.string().optional(),
    problem: z.string().optional(),
    result: z.string().optional(),
  }),
});

const site = defineCollection({
  loader: file('src/content/site.yaml'),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    location: z.string(),
    timezone: z.string(),
    timezoneLabel: z.string(),
    availability: z.string(),
    graduation: z.string(),
    email: z.email(),
    links: z.object({ linkedin: z.url(), github: z.url(), scholar: z.url() }),
    pitch: z.array(z.string()).length(4),
    statement: z.string(),
    marquee: z.string(),
  }),
});

const numbers = defineCollection({
  loader: file('src/content/numbers.yaml'),
  schema: z.object({ order: z.number().int(), numeral: z.string(), caption: z.string() }),
});

const experience = defineCollection({
  loader: file('src/content/experience.yaml'),
  schema: z.object({
    order: z.number().int(),
    org: z.string(),
    role: z.string(),
    place: z.string().optional(),
    dates: z.string(),
    summary: z.string(),
  }),
});

const education = defineCollection({
  loader: file('src/content/education.yaml'),
  schema: z.object({ order: z.number().int(), school: z.string(), detail: z.string(), dates: z.string() }),
});

const about = defineCollection({
  loader: file('src/content/about.yaml'),
  schema: z.object({
    heading: z.string(),
    bio: z.string(),
    facts: z.array(z.string()).length(4),
    interests: z.array(z.string()).min(1),
    collage: z.array(z.object({ file: z.string(), caption: z.string().optional() })).min(1),
  }),
});

const resume = defineCollection({
  loader: file('src/content/resume.yaml'),
  schema: z.object({
    skills: z.array(z.object({ label: z.string(), items: z.string() })),
    certifications: z.array(z.string()),
    awards: z.array(z.string()),
    publication: z.object({ citation: z.string(), url: z.url() }),
  }),
});

export const collections = { projects, site, numbers, experience, education, about, resume };
```

- [ ] **Step 8: Write the content helpers**

`src/lib/content.ts`:

```ts
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

type Project = CollectionEntry<'projects'>;

/** A flagship project is guaranteed to carry everything its case-study page needs. */
export type Flagship = Project & { data: { cover: string; problem: string; result: string } };

export const GROUP_LABELS = {
  quant: 'Quant and fintech',
  fullstack: 'Full-stack and client work',
  mobile: 'Mobile',
  hackathon: 'Hackathons',
  hardware: 'Hardware',
} as const;

export type CardGroup = keyof typeof GROUP_LABELS;

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export async function getSite() {
  const entry = await getEntry('site', 'main');
  if (!entry) throw new Error('src/content/site.yaml must contain a "main" entry');
  return entry.data;
}

export async function getAbout() {
  const entry = await getEntry('about', 'main');
  if (!entry) throw new Error('src/content/about.yaml must contain a "main" entry');
  return entry.data;
}

export async function getResume() {
  const entry = await getEntry('resume', 'main');
  if (!entry) throw new Error('src/content/resume.yaml must contain a "main" entry');
  return entry.data;
}

export async function getNumbers() {
  return (await getCollection('numbers')).sort(byOrder);
}

export async function getExperience() {
  return (await getCollection('experience')).sort(byOrder);
}

export async function getEducation() {
  return (await getCollection('education')).sort(byOrder);
}

export async function getProjects(): Promise<Project[]> {
  return (await getCollection('projects')).sort(byOrder);
}

function isFlagship(project: Project): project is Flagship {
  const { kind, cover, problem, result } = project.data;
  return kind === 'flagship' && Boolean(cover && problem && result);
}

export async function getFlagship(): Promise<Flagship[]> {
  const candidates = (await getProjects()).filter((project) => project.data.kind === 'flagship');
  const incomplete = candidates.filter((project) => !isFlagship(project));
  if (incomplete.length > 0) {
    const ids = incomplete.map((project) => project.id).join(', ');
    throw new Error(`Flagship projects need cover, problem and result in their frontmatter: ${ids}`);
  }
  return candidates.filter(isFlagship);
}

export async function getCardsByGroup(): Promise<{ group: CardGroup; label: string; projects: Project[] }[]> {
  const cards = (await getProjects()).filter((project) => project.data.kind === 'card');
  return (Object.keys(GROUP_LABELS) as CardGroup[]).map((group) => ({
    group,
    label: GROUP_LABELS[group],
    projects: cards.filter((project) => project.data.group === group),
  }));
}
```

- [ ] **Step 9: Read the name from content on the home page**

Replace `src/pages/index.astro` with:

```astro
---
import { getSite } from '../lib/content';

const site = await getSite();
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{site.name}</title>
  </head>
  <body>
    <h1>{site.name}</h1>
  </body>
</html>
```

- [ ] **Step 10: Validate the content against the schemas**

Run: `npx astro sync`
Expected: completes with no schema errors. A wrong field shows as an `InvalidContentEntryDataError` naming the file and field; fix the file and rerun.

- [ ] **Step 11: Run all checks**

Run: `npm run verify`
Expected: `astro check` 0 errors; Vitest passes (clock 3, content rules 28); build completes; Playwright 1 passed (the heading now comes from `site.yaml`).

- [ ] **Step 12: Commit**

```bash
git add src/content.config.ts src/content src/lib/content.ts src/pages/index.astro tests/unit/content-rules.test.ts
git commit -m "feat: add content collections with all site copy and copy-rule tests" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Design tokens, fonts, base layout and navigation

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Nav.astro`, `src/components/Button.astro`, `src/scripts/main.ts`
- Modify: `src/pages/index.astro`
- Test: `tests/e2e/nav.spec.ts`

**Interfaces:**
- Consumes: `getSite()` from `src/lib/content.ts`; `formatClock()` from `src/lib/clock.ts`.
- Produces:
  - `Base.astro` with props `{ title?: string; description?: string }` and a default slot rendered inside `<main id="main">`.
  - `Button.astro` with props `{ href: string; variant?: 'outline' | 'solid'; external?: boolean }` and a default slot for the label.
  - Theme classes `.theme-paper` and `.theme-ink`, which set `--bg`, `--fg`, `--muted`, `--line`, `--accent`.
  - Shared classes `.display`, `.label`, `.serif`, `.sr-only`, `.section`, `.section__head`.
  - Data attributes handled by `src/scripts/main.ts`: `data-reveal` (fades up when scrolled into view; optional `--i` stagger index), `data-inview` (only receives the `is-in` class), `data-fit` (one line of text scaled to exactly fill its box; needs a single child `<span>` and a `--fit-base` font size), `data-island="<name>"` (lazily imports and mounts a script module).
  - In `main.ts`, the registry `const islands: Partial<Record<string, () => Promise<Island>>>` where `type Island = { mount: (el: HTMLElement) => void }`. Later tasks add one line each.
  - `main.ts` adds the class `js` to `<html>` when it runs.

- [ ] **Step 1: Write the failing end-to-end test**

`tests/e2e/nav.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('nav shows the name, the location with a live clock, and four links', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('header.nav');
  await expect(nav.getByRole('link', { name: 'Jason Pereira' })).toHaveAttribute('href', '/');
  await expect(nav.getByText('Chapel Hill, NC')).toBeVisible();
  await expect(nav.locator('[data-clock]')).toHaveText(/^\d{2}:\d{2} ET$/);
  const links = nav.getByRole('navigation', { name: 'Primary' }).getByRole('link');
  await expect(links).toHaveText(['Work', 'About', 'Resume', 'Contact']);
});

test('the page script marks the document as scripted', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\bjs\b/);
});

test('the self-hosted Archivo font loads', async ({ page }) => {
  await page.goto('/');
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    const names: string[] = [];
    document.fonts.forEach((font) => {
      if (font.status === 'loaded') names.push(font.family);
    });
    return names;
  });
  expect(loaded.join(' ')).toMatch(/Archivo/);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build && npx playwright test nav`
Expected: FAIL, `header.nav` is not found.

- [ ] **Step 3: Write the design tokens**

`src/styles/tokens.css`:

```css
:root {
  --paper: #ece7dc;
  --ink: #121210;
  --orange: #ff5a26;
  --orange-deep: #f0440f;

  --font-sans: var(--font-archivo), system-ui, sans-serif;
  --font-serif: var(--font-instrument), Georgia, serif;

  --gutter: clamp(1rem, 0.5rem + 2.2vw, 2.5rem);
  --section-gap: clamp(4.5rem, 3rem + 7vw, 10rem);
  --radius: clamp(1rem, 0.6rem + 1.6vw, 2rem);
  --nav-height: 3.5rem;
  --ease: cubic-bezier(0.2, 0.7, 0.2, 1);
}

.theme-paper {
  --bg: var(--paper);
  --fg: var(--ink);
  --muted: rgb(18 18 16 / 0.64);
  --line: rgb(18 18 16 / 0.16);
  --accent: var(--orange-deep);
}

.theme-ink {
  --bg: var(--ink);
  --fg: var(--paper);
  --muted: rgb(236 231 220 / 0.66);
  --line: rgb(236 231 220 / 0.18);
  --accent: var(--orange);
}

.theme-paper,
.theme-ink {
  background: var(--bg);
  color: var(--fg);
}
```

- [ ] **Step 4: Write the global styles**

`src/styles/global.css`:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3,
p,
ul,
ol,
dl,
dd,
figure {
  margin: 0;
}

ul,
ol {
  padding: 0;
  list-style: none;
}

img,
picture,
canvas,
svg {
  display: block;
  max-width: 100%;
}

img {
  height: auto;
}

a {
  color: inherit;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.2em;
}

button {
  font: inherit;
  color: inherit;
}

:focus-visible {
  outline: 2px solid var(--accent, var(--orange-deep));
  outline-offset: 3px;
}

[id] {
  scroll-margin-top: var(--nav-height);
}

/* Wide, heavy, uppercase: the display voice. */
.display {
  font-family: var(--font-sans);
  font-weight: 900;
  font-stretch: 125%;
  line-height: 0.92;
  letter-spacing: -0.015em;
  text-transform: uppercase;
}

/* Small uppercase labels. */
.label {
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Serif italic accent words inside headlines. */
.serif {
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 400;
  font-stretch: 100%;
  letter-spacing: 0;
  text-transform: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  top: -4rem;
  left: var(--gutter);
  z-index: 200;
  padding: 0.6rem 1rem;
  background: var(--ink);
  color: var(--paper);
}

.skip-link:focus {
  top: 0.5rem;
}

.section {
  position: relative;
  isolation: isolate;
  overflow-x: clip;
  padding: var(--section-gap) var(--gutter);
}

.section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem 2rem;
  margin-bottom: clamp(2rem, 4vw, 4rem);
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
}

/* One line of text scaled to fill its box. main.ts sets --fit after the fonts load. */
[data-fit] {
  display: block;
  white-space: nowrap;
  font-size: calc(var(--fit-base, 8vw) * var(--fit, 1));
}

[data-fit] > span {
  display: inline-block;
}

/* Reveal on scroll. Only applies once main.ts has added .js, so content is never hidden without scripts. */
@media (prefers-reduced-motion: no-preference) {
  .js [data-reveal] {
    opacity: 0;
    transform: translateY(1.5rem);
    transition:
      opacity 0.7s var(--ease),
      transform 0.7s var(--ease);
    transition-delay: calc(var(--i, 0) * 70ms);
  }

  .js [data-reveal].is-in {
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Step 5: Write the button component**

`src/components/Button.astro`:

```astro
---
interface Props {
  href: string;
  variant?: 'outline' | 'solid';
  external?: boolean;
}

const { href, variant = 'outline', external = false } = Astro.props;
const externalAttrs = external ? { target: '_blank', rel: 'noopener' } : {};
---
<a class:list={['button', `button--${variant}`]} href={href} {...externalAttrs}>
  <span><slot /></span>
  <svg class="button__arrow" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"></path>
  </svg>
</a>

<style>
  .button {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.8rem 1.15rem;
    border: 1px solid currentColor;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.08em;
    text-decoration: none;
    text-transform: uppercase;
    transition:
      background-color 0.25s var(--ease),
      color 0.25s var(--ease),
      border-color 0.25s var(--ease);
  }

  .button--solid {
    border-color: var(--fg);
    background: var(--fg);
    color: var(--bg);
  }

  .button--outline:hover {
    border-color: var(--fg);
    background: var(--fg);
    color: var(--bg);
  }

  .button--solid:hover {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--ink);
  }

  .button__arrow {
    transition: transform 0.25s var(--ease);
  }

  .button:hover .button__arrow {
    transform: translateX(3px);
  }
</style>
```

- [ ] **Step 6: Write the navigation**

`src/components/Nav.astro`:

```astro
---
import { getSite } from '../lib/content';

const site = await getSite();
const links = [
  { href: '/work', label: 'Work', optional: false },
  { href: '/#about', label: 'About', optional: true },
  { href: '/resume', label: 'Resume', optional: false },
  { href: '#contact', label: 'Contact', optional: false },
];
---
<header class="nav">
  <a class="nav__name" href="/">{site.name}</a>
  <p class="nav__meta label">
    <span>{site.location}</span>
    <span data-clock data-tz={site.timezone} data-tz-label={site.timezoneLabel} aria-hidden="true"></span>
  </p>
  <nav class="nav__links label" aria-label="Primary">
    {links.map((link) => (
      <a href={link.href} data-optional={link.optional ? '' : undefined}>{link.label}</a>
    ))}
  </nav>
</header>

<style>
  /* White text with difference blending reads as ink over paper and as paper over ink. */
  .nav {
    position: fixed;
    inset: 0 0 auto;
    z-index: 100;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 1rem;
    height: var(--nav-height);
    padding: 0 var(--gutter);
    color: #fff;
    mix-blend-mode: difference;
    pointer-events: none;
  }

  .nav a {
    pointer-events: auto;
    text-decoration: none;
  }

  .nav a:hover {
    text-decoration: underline;
  }

  .nav__name {
    justify-self: start;
    font-size: 0.8125rem;
    font-weight: 900;
    font-stretch: 125%;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .nav__meta {
    display: flex;
    gap: 0.75rem;
    white-space: nowrap;
  }

  .nav__links {
    display: flex;
    justify-self: end;
    gap: clamp(0.7rem, 1.6vw, 1.75rem);
  }

  @media (max-width: 720px) {
    .nav {
      grid-template-columns: 1fr auto;
    }

    .nav__meta {
      display: none;
    }

    .nav__links {
      letter-spacing: 0.04em;
    }
  }

  @media (max-width: 400px) {
    .nav__links a[data-optional] {
      display: none;
    }
  }
</style>
```

- [ ] **Step 7: Write the page script**

`src/scripts/main.ts`:

```ts
import { formatClock } from '../lib/clock';

type Island = { mount: (el: HTMLElement) => void };

// Script modules loaded only when their section nears the viewport. One line per module.
const islands: Partial<Record<string, () => Promise<Island>>> = {};

document.documentElement.classList.add('js');

// Live clock in the nav.
const clock = document.querySelector<HTMLElement>('[data-clock]');
if (clock) {
  const zone = clock.dataset.tz ?? 'America/New_York';
  const label = clock.dataset.tzLabel ?? 'ET';
  const tick = () => {
    clock.textContent = formatClock(new Date(), zone, label);
  };
  tick();
  setInterval(tick, 30_000);
}

// Scale each [data-fit] line so its text exactly fills its box.
const fitTargets = Array.from(document.querySelectorAll<HTMLElement>('[data-fit]'));
const fit = () => {
  for (const el of fitTargets) {
    const inner = el.firstElementChild;
    if (!inner) continue;
    el.style.setProperty('--fit', '1');
    const width = inner.getBoundingClientRect().width;
    if (width > 0) el.style.setProperty('--fit', (el.clientWidth / width).toFixed(4));
  }
};
if (fitTargets.length > 0) {
  void document.fonts.ready.then(fit);
  let queued = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(queued);
    queued = requestAnimationFrame(fit);
  });
}

// Mark elements as they scroll into view.
const inView = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      inView.unobserve(entry.target);
    }
  },
  { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
);
document.querySelectorAll('[data-reveal], [data-inview]').forEach((el) => inView.observe(el));

// Import and mount each island when it comes within 300px of the viewport.
const nearView = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      nearView.unobserve(el);
      const name = el.dataset.island ?? '';
      const load = islands[name];
      if (!load) {
        console.error(`No script module is registered for data-island="${name}"`);
        continue;
      }
      load()
        .then((island) => island.mount(el))
        .catch((error: unknown) => console.error(`Island "${name}" failed to start`, error));
    }
  },
  { rootMargin: '300px' },
);
document.querySelectorAll<HTMLElement>('[data-island]').forEach((el) => nearView.observe(el));
```

- [ ] **Step 8: Write the base layout**

`src/layouts/Base.astro`:

```astro
---
import { Font } from 'astro:assets';
import Nav from '../components/Nav.astro';
import { getSite } from '../lib/content';
import '../styles/tokens.css';
import '../styles/global.css';

interface Props {
  title?: string;
  description?: string;
}

const site = await getSite();
const { title, description = site.description } = Astro.props;
const fullTitle = title ? `${title} / ${site.name}` : site.name;
const canonical = new URL(Astro.url.pathname, Astro.site);
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{fullTitle}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical.href} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={fullTitle} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical.href} />
    <meta name="theme-color" content="#ECE7DC" />
    <Font cssVariable="--font-archivo" preload />
    <Font cssVariable="--font-instrument" />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <Nav />
    <main id="main">
      <slot />
    </main>
    <script>
      import '../scripts/main.ts';
    </script>
  </body>
</html>
```

- [ ] **Step 9: Use the layout on the home page**

Replace `src/pages/index.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import { getSite } from '../lib/content';

const site = await getSite();
---
<Base>
  <section class="section theme-paper">
    <h1 class="display">{site.name}</h1>
  </section>
</Base>
```

- [ ] **Step 10: Run all checks**

Run: `npm run verify`
Expected: `astro check` 0 errors; Vitest passes; build completes and lists the two font files under `dist/_astro/fonts/`; Playwright 4 passed (home 1, nav 3).

- [ ] **Step 11: Look at it**

Run: `npm run dev`, open `http://localhost:4321/`.
Expected: paper background, the name in wide heavy uppercase, a fixed nav with name, "Chapel Hill, NC" plus a ticking clock, and four links. Stop the dev server afterwards.

- [ ] **Step 12: Commit**

```bash
git add src/styles src/layouts src/components src/scripts src/pages/index.astro tests/e2e/nav.spec.ts
git commit -m "feat: add design tokens, self-hosted fonts, base layout and navigation" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Placeholder images, asset lookup and the placeholder guard

Jason's portrait, photos and screenshots arrive later (Task 15). Until then the build uses clearly marked placeholders at the final file paths, so swapping in a real file needs no code change. A guard script fails while any placeholder is still in use, so placeholders cannot reach production unnoticed.

**Files:**
- Create: `scripts/make-placeholders.mjs`, `scripts/check-assets.mjs`, `src/lib/asset-lookup.ts`, `src/lib/assets.ts`, `README.md`
- Create (generated): `src/assets/portrait.png`, `src/assets/work/{case-closed,orbit,streetlab,gpu-portfolio-engine}.png`, `src/assets/collage/0{1..6}.jpg`, `src/assets/placeholders.json`
- Modify: `package.json` (two scripts)
- Test: `tests/unit/asset-lookup.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `createAssetLookup<T>(modules: Record<string, { default: T }>): { asset(path: string): T; assetsIn(dir: string): T[] }` in `src/lib/asset-lookup.ts`.
  - `asset(path: string): ImageMetadata` and `assetsIn(dir: string): ImageMetadata[]` in `src/lib/assets.ts`. Paths are relative to `src/assets/`, for example `asset('work/orbit.png')`. `asset` throws `Missing image: src/assets/<path>` when the file does not exist.
  - npm scripts `placeholders` and `check:assets`.

- [ ] **Step 1: Write the failing unit test**

`tests/unit/asset-lookup.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { createAssetLookup } from '../../src/lib/asset-lookup';

const { asset, assetsIn } = createAssetLookup({
  '/src/assets/portrait.png': { default: 'portrait' },
  '/src/assets/work/orbit.png': { default: 'orbit-cover' },
  '/src/assets/work/orbit/02.png': { default: 'orbit-2' },
  '/src/assets/work/orbit/01.png': { default: 'orbit-1' },
  '/src/assets/work/orbit/deep/03.png': { default: 'orbit-3' },
});

describe('asset', () => {
  test('returns the image stored under src/assets', () => {
    expect(asset('portrait.png')).toBe('portrait');
    expect(asset('work/orbit.png')).toBe('orbit-cover');
  });

  test('throws a message naming the missing file', () => {
    expect(() => asset('work/missing.png')).toThrow('Missing image: src/assets/work/missing.png');
  });
});

describe('assetsIn', () => {
  test('lists the images directly inside a folder, sorted by file name', () => {
    expect(assetsIn('work/orbit')).toEqual(['orbit-1', 'orbit-2']);
  });

  test('returns an empty list for a folder with no images', () => {
    expect(assetsIn('work/streetlab')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test`
Expected: FAIL, the import of `../../src/lib/asset-lookup` cannot be resolved.

- [ ] **Step 3: Implement the lookup**

`src/lib/asset-lookup.ts`:

```ts
/** Looks images up by their path under `src/assets/`. Generic so it can be tested without real image files. */
export function createAssetLookup<T>(modules: Record<string, { default: T }>) {
  return {
    /** The image at `src/assets/<path>`. Throws when it does not exist, so a missing file fails the build. */
    asset(path: string): T {
      const found = modules[`/src/assets/${path}`];
      if (!found) throw new Error(`Missing image: src/assets/${path}`);
      return found.default;
    },

    /** Every image directly inside `src/assets/<dir>/`, sorted by file name. */
    assetsIn(dir: string): T[] {
      const prefix = `/src/assets/${dir}/`;
      return Object.keys(modules)
        .filter((key) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
        .sort()
        .map((key) => modules[key].default);
    },
  };
}
```

`src/lib/assets.ts`:

```ts
import type { ImageMetadata } from 'astro';
import { createAssetLookup } from './asset-lookup';

const modules = import.meta.glob<{ default: ImageMetadata }>('/src/assets/**/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
});

export const { asset, assetsIn } = createAssetLookup(modules);
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npm run test`
Expected: PASS, including 4 asset-lookup tests.

- [ ] **Step 5: Write the placeholder generator**

`scripts/make-placeholders.mjs`:

```js
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
```

- [ ] **Step 6: Write the placeholder guard**

`scripts/check-assets.mjs`:

```js
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
```

- [ ] **Step 7: Add the npm scripts**

In `package.json`, add these two lines to `"scripts"` (after `"test:e2e"`):

```json
    "placeholders": "node scripts/make-placeholders.mjs",
    "check:assets": "node scripts/check-assets.mjs",
```

- [ ] **Step 8: Generate the placeholders and confirm the guard catches them**

Run: `npm run placeholders`
Expected: eleven `created placeholder src/assets/...` lines, then `11 placeholder(s) recorded in src/assets/placeholders.json`.

Run: `npm run check:assets`
Expected: exits with status 1 and prints `11 placeholder image(s) still in use:` followed by the eleven paths, plus the note about the missing resume PDF. This failure is correct at this stage.

Run: `npm run placeholders` a second time.
Expected: no `created` lines (nothing is overwritten), still `11 placeholder(s) recorded`.

- [ ] **Step 9: Write the README**

`README.md`:

````md
# Jason Pereira — portfolio

Static site built with Astro. Design and content specs are in `docs/superpowers/specs/`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server at http://localhost:4321 |
| `npm run verify` | Type check, unit tests, build, end-to-end tests |
| `npm run placeholders` | Create placeholder images for any that are missing |
| `npm run check:assets` | Fail if any placeholder image is still in use |

## Changing the copy

All text is in `src/content/`. Project pages are the Markdown files in `src/content/projects/`. A wrong or missing field fails the build with the file and field named.

## Replacing a placeholder image

Save the real file over the placeholder at the same path, with the same name and extension:

| Image | Path |
|---|---|
| Portrait (transparent background) | `src/assets/portrait.png` |
| Project covers | `src/assets/work/<slug>.png` |
| Extra case-study images | `src/assets/work/<slug>/01.png`, `02.png`, … |
| Collage photos | `src/assets/collage/01.jpg` … `06.jpg` |
| Resume PDF | `public/jason-pereira-resume.pdf` |

Then run `npm run placeholders` (it stops tracking replaced files) and `npm run check:assets`.
````

- [ ] **Step 10: Run all checks and commit**

Run: `npm run verify`
Expected: all green, as in Task 3 plus the 4 asset-lookup tests.

```bash
git add scripts src/lib/asset-lookup.ts src/lib/assets.ts src/assets package.json README.md tests/unit/asset-lookup.test.ts
git commit -m "feat: add placeholder images, asset lookup and placeholder guard" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Contour-line background

The lines are generated once at build time into `/contours.svg` and used as a CSS mask, so any section can show them in its own line colour with no script running in the browser.

**Files:**
- Create: `src/lib/contours.ts`, `src/pages/contours.svg.ts`, `src/components/ContourBg.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/unit/contours.test.ts`, `tests/e2e/contours.spec.ts`

**Interfaces:**
- Consumes: the `--line` colour from the theme classes.
- Produces:
  - `contourSvg(overrides?: Partial<ContourOptions>): string`, `ringToPath(ring, project): string`, `mulberry32(seed: number): () => number` in `src/lib/contours.ts`.
  - `GET /contours.svg`.
  - `ContourBg.astro` (no props). Place it as a direct child of an element that has `position: relative` and `isolation: isolate` (the `.section` class provides both); it fills that element behind its content.

- [ ] **Step 1: Write the failing unit test**

`tests/unit/contours.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { contourSvg, mulberry32, ringToPath } from '../../src/lib/contours';

describe('mulberry32', () => {
  test('is deterministic for a seed and stays within [0, 1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(mulberry32(8)()).not.toBe(first[0]);
  });
});

describe('ringToPath', () => {
  const identity = (point: readonly number[]): [number, number] => [point[0], point[1]];

  test('draws a closed ring as smooth curves through the midpoints of its sides', () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ];
    expect(ringToPath(square, identity)).toBe('M0,5Q0,0 5,0Q10,0 10,5Q10,10 5,10Q0,10 0,5Z');
  });

  test('rounds coordinates to whole units', () => {
    const triangle = [
      [0.4, 0.4],
      [9.6, 0.4],
      [5, 8.2],
      [0.4, 0.4],
    ];
    expect(ringToPath(triangle, identity)).toMatch(/^M\d+,\d+(Q\d+,\d+ \d+,\d+){3}Z$/);
  });

  test('skips rings too small to draw', () => {
    const sliver = [
      [0, 0],
      [1, 1],
      [0, 0],
    ];
    expect(ringToPath(sliver, identity)).toBe('');
  });
});

describe('contourSvg', () => {
  const svg = contourSvg();

  test('is a 1600 by 1000 SVG with one unfilled, stroked path', () => {
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('viewBox="0 0 1600 1000"');
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).toContain('fill="none"');
  });

  test('is deterministic, so every build ships the same file', () => {
    expect(contourSvg()).toBe(svg);
  });

  test('draws a useful number of curves and stays small', () => {
    expect((svg.match(/Q/g) ?? []).length).toBeGreaterThan(150);
    expect(svg.length).toBeLessThan(40_000);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test`
Expected: FAIL, the import of `../../src/lib/contours` cannot be resolved.

- [ ] **Step 3: Implement the generator**

`src/lib/contours.ts`:

```ts
import { contours } from 'd3-contour';
import { createNoise2D } from 'simplex-noise';

type Point = [number, number];

export interface ContourOptions {
  width: number;
  height: number;
  /** Columns and rows of the grid the height field is sampled on. */
  cols: number;
  rows: number;
  /** Number of contour lines. */
  levels: number;
  seed: number;
  /** Grid cells kept outside each edge, so lines run off the artwork instead of tracing its border. */
  margin: number;
}

const DEFAULTS: ContourOptions = {
  width: 1600,
  height: 1000,
  cols: 64,
  rows: 40,
  levels: 8,
  seed: 20261003,
  margin: 2,
};

/** Small seeded random generator, so the artwork is identical on every build. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns a closed ring of points into an SVG path of smooth curves through the midpoints of its sides. */
export function ringToPath(
  ring: readonly (readonly number[])[],
  project: (point: readonly number[]) => Point,
): string {
  const points = ring.slice(0, -1).map(project); // the last point repeats the first
  if (points.length < 3) return '';
  const fmt = (value: number) => String(Math.round(value) + 0); // "+ 0" turns -0 into 0
  const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(points[points.length - 1], points[0]);
  let d = `M${fmt(start[0])},${fmt(start[1])}`;
  points.forEach((point, index) => {
    const end = mid(point, points[(index + 1) % points.length]);
    d += `Q${fmt(point[0])},${fmt(point[1])} ${fmt(end[0])},${fmt(end[1])}`;
  });
  return `${d}Z`;
}

/** The contour artwork as an SVG string: thin level lines over a gently rolling height field. */
export function contourSvg(overrides: Partial<ContourOptions> = {}): string {
  const { width, height, cols, rows, levels, seed, margin } = { ...DEFAULTS, ...overrides };
  const noise = createNoise2D(mulberry32(seed));

  const values = new Array<number>(cols * rows);
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const u = x / cols;
      const v = y / cols; // divide both by cols so the field is not stretched
      const value = noise(u * 1.7, v * 1.7) + 0.4 * noise(u * 3.9 + 11.3, v * 3.9 + 4.1);
      values[y * cols + x] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  const thresholds = Array.from({ length: levels }, (_, index) => min + ((max - min) * (index + 1)) / (levels + 1));
  const scaleX = width / (cols - margin * 2);
  const scaleY = height / (rows - margin * 2);
  const project = (point: readonly number[]): Point => [(point[0] - margin) * scaleX, (point[1] - margin) * scaleY];

  let d = '';
  for (const shape of contours().size([cols, rows]).thresholds(thresholds)(values)) {
    for (const polygon of shape.coordinates) {
      for (const ring of polygon) d += ringToPath(ring, project);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${d}" fill="none" stroke="#000" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npm run test`
Expected: PASS, including 7 contour tests.

- [ ] **Step 5: Write the failing end-to-end test**

`tests/e2e/contours.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('the contour artwork is served as an SVG image', async ({ request }) => {
  const response = await request.get('/contours.svg');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('image/svg+xml');
  expect(await response.text()).toContain('<path ');
});

test('a section can show the contour lines behind its content', async ({ page }) => {
  await page.goto('/');
  const mask = await page
    .locator('.contours__lines')
    .first()
    .evaluate((el) => {
      const style = getComputedStyle(el);
      return style.maskImage || style.webkitMaskImage;
    });
  expect(mask).toContain('contours.svg');
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm run build && npx playwright test contours`
Expected: FAIL, `/contours.svg` returns 404 and `.contours__lines` is not found.

- [ ] **Step 7: Serve the artwork and add the component**

`src/pages/contours.svg.ts`:

```ts
import type { APIRoute } from 'astro';
import { contourSvg } from '../lib/contours';

export const GET: APIRoute = () =>
  new Response(contourSvg(), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
```

`src/components/ContourBg.astro`:

```astro
---
// The URL is passed as an inline custom property so the bundler does not try to resolve it at build time.
---
<div class="contours" aria-hidden="true">
  <div class="contours__lines" style="--contour-url: url('/contours.svg')"></div>
</div>

<style>
  .contours {
    position: absolute;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
  }

  .contours__lines {
    position: absolute;
    inset: -10%;
    background: var(--line);
    -webkit-mask: var(--contour-url) center / cover no-repeat;
    mask: var(--contour-url) center / cover no-repeat;
  }

  @media (prefers-reduced-motion: no-preference) {
    .contours__lines {
      animation: contour-drift 80s ease-in-out infinite alternate;
    }
  }

  @keyframes contour-drift {
    from {
      transform: translate3d(-2.5%, -1.5%, 0) rotate(-1deg);
    }

    to {
      transform: translate3d(2.5%, 1.5%, 0) rotate(1.5deg) scale(1.06);
    }
  }
</style>
```

- [ ] **Step 8: Show the lines on the home page**

Replace `src/pages/index.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import ContourBg from '../components/ContourBg.astro';
import { getSite } from '../lib/content';

const site = await getSite();
---
<Base>
  <section class="section theme-paper">
    <ContourBg />
    <h1 class="display">{site.name}</h1>
  </section>
</Base>
```

- [ ] **Step 9: Run all checks**

Run: `npm run verify`
Expected: all green; Playwright 6 passed. `dist/contours.svg` exists and is under 40 KB.

- [ ] **Step 10: Look at it**

Run: `npm run dev`, open `http://localhost:4321/`.
Expected: faint, thin, flowing contour lines behind the name, drifting very slowly. If the lines look too dense or too sparse, change `levels` in `DEFAULTS` (the unit test allows a wide range) and rebuild.

- [ ] **Step 11: Commit**

```bash
git add src/lib/contours.ts src/pages/contours.svg.ts src/components/ContourBg.astro src/pages/index.astro tests/unit/contours.test.ts tests/e2e/contours.spec.ts
git commit -m "feat: add build-time contour line artwork and background component" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Hero with the paint-wash interaction

Moving the pointer over the portrait lays soft, fluid washes of paint that trail the pointer, wobble, and shrink away so the face returns. The paint is a list of "blobs" managed by a pure simulation (`src/lib/wash.ts`, unit tested) and drawn by a small canvas renderer (`src/scripts/hero-wash.ts`).

**Files:**
- Create: `src/lib/wash.ts`, `src/scripts/hero-wash.ts`, `src/components/sections/Hero.astro`
- Modify: `src/scripts/main.ts` (register the island), `src/pages/index.astro`
- Test: `tests/unit/wash.test.ts`, `tests/e2e/hero.spec.ts`

**Interfaces:**
- Consumes: `getSite()`; `asset('portrait.png')`; `Button.astro`; `ContourBg.astro`; the `data-fit` and `data-island` attributes and the `islands` registry from `main.ts`.
- Produces:
  - In `src/lib/wash.ts`: `type Tone = 'orange' | 'ink' | 'paper'`; `interface Blob { x; y; r; born; life; tone; seed }`; `interface WashOptions`; `WASH_DEFAULTS`; `blobScale(t: number): number`; `createWash(overrides?: Partial<WashOptions>)` returning `{ pointerTo(x, y): void; release(): void; step(now: number): readonly Blob[]; readonly active: boolean }`; `type WashSim`.
  - In `src/scripts/hero-wash.ts`: `mount(hero: HTMLElement): void`. It sets `data-ready="true"` on the canvas once listening, and does nothing under reduced motion.
  - `Hero.astro` (no props) rendering `<section class="hero theme-paper" id="top" data-island="hero-wash">` containing the page's only `<h1>`.

- [ ] **Step 1: Write the failing unit test for the paint simulation**

`tests/unit/wash.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { blobScale, createWash } from '../../src/lib/wash';

const half = () => 0.5;
const sequence = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe('blobScale', () => {
  test('is zero at birth and at the end of life', () => {
    expect(blobScale(0)).toBe(0);
    expect(blobScale(1)).toBe(0);
  });

  test('holds full size through the middle of life', () => {
    expect(blobScale(0.25)).toBe(1);
    expect(blobScale(0.4)).toBe(1);
  });

  test('shrinks with an ease-in after 40% of life', () => {
    expect(blobScale(0.7)).toBeCloseTo(0.75, 5);
    expect(blobScale(0.9)).toBeLessThan(blobScale(0.7));
  });
});

describe('createWash', () => {
  test('lays one blob at the pointer on the first step', () => {
    const sim = createWash({ random: half });
    sim.pointerTo(100, 120);
    const blobs = sim.step(0);
    expect(blobs).toHaveLength(1);
    expect(blobs[0]).toMatchObject({ x: 100, y: 120, tone: 'orange', born: 0 });
    expect(blobs[0].r).toBe(62); // midpoint of the default 46–78 range
  });

  test('lays blobs along the path exactly one spacing apart, even when the pointer moves fast', () => {
    const sim = createWash({ random: half, spacing: 20, dwell: Infinity });
    sim.pointerTo(0, 50);
    sim.step(0);
    sim.pointerTo(400, 50);
    let blobs = sim.step(0);
    for (let now = 16; now <= 1600; now += 16) blobs = sim.step(now);
    expect(blobs.length).toBeGreaterThan(10);
    for (let index = 1; index < blobs.length; index++) {
      expect(blobs[index].y).toBeCloseTo(50, 5);
      expect(blobs[index].x - blobs[index - 1].x).toBeCloseTo(20, 5);
    }
    expect(blobs[blobs.length - 1].x).toBeLessThanOrEqual(400);
  });

  test('keeps a pool of paint under a pointer that has stopped moving', () => {
    const sim = createWash({ random: half, dwell: 500 });
    sim.pointerTo(100, 100);
    expect(sim.step(0)).toHaveLength(1);
    expect(sim.step(499)).toHaveLength(1);
    expect(sim.step(501)).toHaveLength(2);
  });

  test('blobs expire after their life, and the sim goes idle once released', () => {
    const sim = createWash({ random: half, life: 1000 });
    sim.pointerTo(10, 10);
    sim.step(0);
    sim.release();
    expect(sim.active).toBe(true); // one blob is still fading
    expect(sim.step(999)).toHaveLength(1);
    expect(sim.step(1000)).toHaveLength(0);
    expect(sim.active).toBe(false);
  });

  test('releasing stops new paint', () => {
    const sim = createWash({ random: half, dwell: 100 });
    sim.pointerTo(10, 10);
    sim.step(0);
    sim.release();
    expect(sim.step(500)).toHaveLength(1);
  });

  test('never holds more than maxBlobs', () => {
    const sim = createWash({ random: half, spacing: 1, maxBlobs: 5, dwell: Infinity });
    sim.pointerTo(0, 0);
    sim.step(0);
    sim.pointerTo(500, 0);
    let blobs = sim.step(16);
    for (let now = 32; now < 400; now += 16) blobs = sim.step(now);
    expect(blobs).toHaveLength(5);
  });

  test('sometimes throws a small ink or paper droplet beside the stroke', () => {
    // Order of random draws: radius, seed, droplet roll, angle, distance, tone, droplet seed.
    const sim = createWash({ random: sequence([0.5, 0.1, 0.05, 0, 0, 0.2, 0.9]) });
    sim.pointerTo(100, 100);
    const [main, droplet] = sim.step(0);
    expect(main.tone).toBe('orange');
    expect(droplet.tone).toBe('ink');
    expect(droplet.r).toBeCloseTo(main.r * 0.3, 5);
    expect(droplet.x).toBeCloseTo(100 + main.r * 0.9, 5);
    expect(droplet.y).toBeCloseTo(100, 5);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test`
Expected: FAIL, the import of `../../src/lib/wash` cannot be resolved.

- [ ] **Step 3: Implement the paint simulation**

`src/lib/wash.ts`:

```ts
export type Tone = 'orange' | 'ink' | 'paper';

export interface Blob {
  x: number;
  y: number;
  /** Full-size radius in CSS pixels. */
  r: number;
  /** Timestamp in ms when the blob was laid down. */
  born: number;
  /** Lifetime in ms. */
  life: number;
  tone: Tone;
  /** 0–1. Offsets the wobble so neighbouring blobs do not pulse in step. */
  seed: number;
}

export interface WashOptions {
  /** Distance in px between blobs laid along the pointer's path. */
  spacing: number;
  /** Smallest and largest blob radius in px. */
  radius: readonly [number, number];
  /** How long a blob lives, in ms. */
  life: number;
  /** A still pointer lays a fresh blob this often, in ms. */
  dwell: number;
  maxBlobs: number;
  /** How quickly the paint follows the pointer, per 60 fps frame (0–1). */
  ease: number;
  /** Chance that a blob throws a small ink or paper droplet beside it. */
  dropletChance: number;
  /** Random source; replaced in tests. */
  random: () => number;
}

export const WASH_DEFAULTS: WashOptions = {
  spacing: 22,
  radius: [46, 78],
  life: 2600,
  dwell: 780,
  maxBlobs: 90,
  ease: 0.22,
  dropletChance: 0.14,
  random: Math.random,
};

const FRAME_MS = 1000 / 60;
const MAX_SPAWNS_PER_STEP = 12;

/** Size of a blob at fraction `t` of its life: quick ease-out growth, a hold, then an ease-in shrink to nothing. */
export function blobScale(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  const grow = 1 - (1 - Math.min(1, t / 0.1)) ** 3;
  const fade = t <= 0.4 ? 1 : 1 - ((t - 0.4) / 0.6) ** 2;
  return grow * fade;
}

/** A paint trail that eases after the pointer, laying blobs that live for a while and then vanish. */
export function createWash(overrides: Partial<WashOptions> = {}) {
  const options: WashOptions = { ...WASH_DEFAULTS, ...overrides };
  let blobs: Blob[] = [];
  let target: { x: number; y: number } | null = null;
  let emitter: { x: number; y: number } | null = null;
  let lastSpawn: { x: number; y: number; at: number } | null = null;
  let lastStep: number | null = null;

  const spawn = (x: number, y: number, now: number) => {
    const [min, max] = options.radius;
    const r = min + (max - min) * options.random();
    blobs.push({ x, y, r, born: now, life: options.life, tone: 'orange', seed: options.random() });
    if (options.random() < options.dropletChance) {
      const angle = options.random() * Math.PI * 2;
      const distance = r * (0.9 + options.random() * 0.5);
      const tone: Tone = options.random() < 0.5 ? 'ink' : 'paper';
      blobs.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        r: r * 0.3,
        born: now,
        life: options.life,
        tone,
        seed: options.random(),
      });
    }
    lastSpawn = { x, y, at: now };
  };

  return {
    /** Point the paint should travel toward. The first call after a release starts a new stroke there. */
    pointerTo(x: number, y: number): void {
      target = { x, y };
      if (!emitter) emitter = { x, y };
    },

    /** Stop painting. Existing blobs keep fading. */
    release(): void {
      target = null;
      emitter = null;
      lastSpawn = null;
    },

    /** Advance to time `now` (ms). Returns the live blobs, oldest first. */
    step(now: number): readonly Blob[] {
      const elapsed = lastStep === null ? 0 : Math.min(now - lastStep, 64);
      lastStep = now;

      if (target && emitter) {
        const follow = 1 - (1 - options.ease) ** (elapsed / FRAME_MS);
        emitter.x += (target.x - emitter.x) * follow;
        emitter.y += (target.y - emitter.y) * follow;

        if (!lastSpawn) {
          spawn(emitter.x, emitter.y, now);
        } else {
          let spawned = 0;
          while (spawned < MAX_SPAWNS_PER_STEP) {
            const dx = emitter.x - lastSpawn.x;
            const dy = emitter.y - lastSpawn.y;
            const gap = Math.hypot(dx, dy);
            if (gap < options.spacing) break;
            spawn(lastSpawn.x + (dx / gap) * options.spacing, lastSpawn.y + (dy / gap) * options.spacing, now);
            spawned++;
          }
          if (spawned === 0 && now - lastSpawn.at >= options.dwell) spawn(emitter.x, emitter.y, now);
        }
      }

      blobs = blobs.filter((blob) => now - blob.born < blob.life);
      if (blobs.length > options.maxBlobs) blobs = blobs.slice(blobs.length - options.maxBlobs);
      return blobs;
    },

    /** True while there is paint to draw or a stroke in progress. */
    get active(): boolean {
      return target !== null || blobs.length > 0;
    },
  };
}

export type WashSim = ReturnType<typeof createWash>;
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npm run test`
Expected: PASS, including 10 wash tests.

- [ ] **Step 5: Write the failing end-to-end test**

`tests/e2e/hero.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test';

async function strokeAcrossPortrait(page: Page) {
  const box = await page.locator('.hero__figure').boundingBox();
  if (!box) throw new Error('The hero portrait has no layout box');
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.3);
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, { steps: 15 });
}

const hasPaint = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d');
  if (!context) return false;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let index = 3; index < pixels.length; index += 4) if (pixels[index] > 0) return true;
  return false;
};

test.describe('hero', () => {
  test('shows the pitch, the calls to action, the tags and the portrait', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.hero');
    await expect(hero.getByText('AI engineer who ships.')).toBeVisible();
    await expect(hero.getByText('Co-founder of Case Closed.')).toBeVisible();
    await expect(hero.getByRole('link', { name: 'See the work' })).toHaveAttribute('href', '#work');
    await expect(hero.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', '/resume');
    await expect(hero.getByText('Open to Summer 2027 internships')).toBeVisible();
    await expect(hero.getByRole('img', { name: 'Portrait of Jason Pereira' })).toBeVisible();
  });

  test('the wordmark is fitted to the full width of the hero', async ({ page }) => {
    await page.goto('/');
    const wordmark = page.locator('.hero__wordmark');
    await expect(wordmark).toHaveAttribute('style', /--fit:\s*[\d.]+/);
    const ratio = await wordmark.evaluate((el) => {
      const inner = el.firstElementChild;
      return inner ? inner.getBoundingClientRect().width / el.clientWidth : 0;
    });
    expect(ratio).toBeGreaterThan(0.98);
    expect(ratio).toBeLessThan(1.01);
  });

  test('moving the pointer over the portrait lays paint on the canvas', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('.hero__wash');
    await expect(canvas).toHaveAttribute('data-ready', 'true');
    await strokeAcrossPortrait(page);
    await expect.poll(() => canvas.evaluate(hasPaint)).toBe(true);
  });

  test('with reduced motion the canvas is never painted', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\bjs\b/);
    await strokeAcrossPortrait(page);
    await page.waitForTimeout(400);
    const canvas = page.locator('.hero__wash');
    await expect(canvas).not.toHaveAttribute('data-ready', 'true');
    expect(await canvas.evaluate(hasPaint)).toBe(false);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm run build && npx playwright test hero`
Expected: FAIL, `.hero` is not found.

- [ ] **Step 7: Write the canvas renderer**

`src/scripts/hero-wash.ts`:

```ts
import { blobScale, createWash, type Blob, type Tone } from '../lib/wash';

const COLOURS: Record<Tone, string> = { orange: '#FF5A26', ink: '#121210', paper: '#ECE7DC' };

/** The canvas holds half as many pixels as it covers: cheaper to fill, and the upscale softens every edge. */
const RESOLUTION = 0.5;
const OUTLINE_POINTS = 16;
/** On touch screens, a slow automatic stroke starts this long after the last touch. */
const DRIFT_AFTER_MS = 2500;

function paintBlob(ctx: CanvasRenderingContext2D, blob: Blob, now: number): void {
  const radius = blob.r * blobScale((now - blob.born) / blob.life);
  if (radius < 0.5) return;

  // A circle whose edge wobbles slowly, so the paint looks liquid.
  const phase = blob.seed * Math.PI * 2 + now * 0.0012;
  const outline: [number, number][] = [];
  for (let index = 0; index < OUTLINE_POINTS; index++) {
    const angle = (index / OUTLINE_POINTS) * Math.PI * 2;
    const wobble = 1 + 0.1 * Math.sin(angle * 3 + phase) + 0.05 * Math.sin(angle * 5 - phase * 1.7);
    outline.push([blob.x + Math.cos(angle) * radius * wobble, blob.y + Math.sin(angle) * radius * wobble]);
  }

  ctx.beginPath();
  const last = outline[OUTLINE_POINTS - 1];
  ctx.moveTo((last[0] + outline[0][0]) / 2, (last[1] + outline[0][1]) / 2);
  for (let index = 0; index < OUTLINE_POINTS; index++) {
    const point = outline[index];
    const next = outline[(index + 1) % OUTLINE_POINTS];
    ctx.quadraticCurveTo(point[0], point[1], (point[0] + next[0]) / 2, (point[1] + next[1]) / 2);
  }
  ctx.closePath();
  ctx.fillStyle = COLOURS[blob.tone];
  ctx.fill();
}

export function mount(hero: HTMLElement): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = hero.querySelector<HTMLCanvasElement>('.hero__wash');
  const zone = hero.querySelector<HTMLElement>('.hero__figure');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !zone || !ctx) return;

  const sim = createWash();
  const drift = matchMedia('(pointer: coarse)').matches;
  let frame = 0;
  let onScreen = true;
  let width = 0;
  let height = 0;
  let lastInput = -Infinity;

  const resize = () => {
    const box = hero.getBoundingClientRect();
    width = box.width;
    height = box.height;
    canvas.width = Math.max(1, Math.round(width * RESOLUTION));
    canvas.height = Math.max(1, Math.round(height * RESOLUTION));
  };

  const draw = (now: number) => {
    frame = 0;
    if (drift && now - lastInput > DRIFT_AFTER_MS) {
      const heroBox = hero.getBoundingClientRect();
      const box = zone.getBoundingClientRect();
      sim.pointerTo(
        box.left - heroBox.left + box.width * (0.5 + 0.2 * Math.sin(now * 0.00045)),
        box.top - heroBox.top + box.height * (0.34 + 0.12 * Math.sin(now * 0.0007 + 1.3)),
      );
    }
    const blobs = sim.step(now);
    ctx.setTransform(RESOLUTION, 0, 0, RESOLUTION, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const blob of blobs) paintBlob(ctx, blob, now);
    if (sim.active) schedule();
  };

  // Only draw while the hero is on screen and the tab is visible.
  const schedule = () => {
    if (!frame && onScreen && !document.hidden) frame = requestAnimationFrame(draw);
  };

  hero.addEventListener('pointermove', (event) => {
    const box = zone.getBoundingClientRect();
    const inside =
      event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) {
      sim.release();
      return;
    }
    const heroBox = hero.getBoundingClientRect();
    lastInput = performance.now();
    sim.pointerTo(event.clientX - heroBox.left, event.clientY - heroBox.top);
    schedule();
  });
  hero.addEventListener('pointerleave', () => sim.release());
  hero.addEventListener('pointercancel', () => sim.release());

  new ResizeObserver(resize).observe(hero);
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    schedule();
  }).observe(hero);
  document.addEventListener('visibilitychange', schedule);

  resize();
  canvas.dataset.ready = 'true';
  if (drift) schedule();
}
```

- [ ] **Step 8: Register the island**

In `src/scripts/main.ts`, replace:

```ts
const islands: Partial<Record<string, () => Promise<Island>>> = {};
```

with:

```ts
const islands: Partial<Record<string, () => Promise<Island>>> = {
  'hero-wash': () => import('./hero-wash'),
};
```

- [ ] **Step 9: Write the hero section**

`src/components/sections/Hero.astro`:

```astro
---
import { Picture } from 'astro:assets';
import Button from '../Button.astro';
import ContourBg from '../ContourBg.astro';
import { asset } from '../../lib/assets';
import { getSite } from '../../lib/content';

const site = await getSite();
const portrait = asset('portrait.png');
---
<section class="hero theme-paper" id="top" data-island="hero-wash">
  <ContourBg />
  <div class="hero__copy">
    <p class="hero__pitch">
      {site.pitch.map((line) => <span>{line}</span>)}
    </p>
    <div class="hero__cta">
      <Button href="#work" variant="solid">See the work</Button>
      <Button href="/resume">Resume</Button>
    </div>
  </div>
  <figure class="hero__figure">
    <Picture
      src={portrait}
      formats={['avif', 'webp']}
      widths={[360, 540, 720, 960, 1200]}
      sizes="(max-width: 720px) 88vw, min(46vw, 620px)"
      alt={`Portrait of ${site.name}`}
      priority
    />
  </figure>
  <div class="hero__foot">
    <div class="hero__tags label">
      <p>{site.availability}</p>
      <p>{site.location}</p>
    </div>
    <h1 class="hero__wordmark display" data-fit><span>{site.name}</span></h1>
  </div>
  <canvas class="hero__wash" aria-hidden="true"></canvas>
</section>

<style>
  /* Layers, back to front: contour lines, portrait (1), tags and wordmark (2), paint (3), copy and buttons (4). */
  .hero {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 100svh;
    padding: calc(var(--nav-height) + 1rem) var(--gutter) 0;
  }

  .hero__copy {
    position: relative;
    z-index: 4;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
  }

  .hero__pitch {
    display: grid;
    gap: 0.15em;
    max-width: 24ch;
    font-size: clamp(0.95rem, 0.75rem + 0.85vw, 1.4rem);
    font-weight: 800;
    line-height: 1.12;
    text-transform: uppercase;
  }

  .hero__cta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.6rem;
  }

  .hero__figure {
    position: absolute;
    bottom: 0;
    left: 50%;
    z-index: 1;
    width: min(46vw, 620px);
    translate: -50% 0;
    touch-action: pan-y;
  }

  .hero__figure :global(img) {
    width: 100%;
    height: auto;
    max-height: 82svh;
    object-fit: contain;
    object-position: bottom;
  }

  /* White with difference blending: ink over the paper, paper over the dark suit. */
  .hero__foot {
    position: absolute;
    right: var(--gutter);
    bottom: clamp(0.5rem, 1.2vw, 1.25rem);
    left: var(--gutter);
    z-index: 2;
    color: #fff;
    mix-blend-mode: difference;
    pointer-events: none;
  }

  .hero__tags {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.4rem;
  }

  .hero__wordmark {
    --fit-base: 8.4vw;
  }

  .hero__wash {
    position: absolute;
    inset: 0;
    z-index: 3;
    width: 100%;
    height: 100%;
    opacity: 0.8;
    pointer-events: none;
  }

  @media (max-width: 720px) {
    .hero__copy {
      flex-direction: column;
    }

    .hero__cta {
      flex-direction: row;
      align-items: center;
    }

    .hero__figure {
      width: 88vw;
    }

    .hero__figure :global(img) {
      max-height: 58svh;
    }
  }
</style>
```

- [ ] **Step 10: Put the hero on the home page**

Replace `src/pages/index.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/sections/Hero.astro';
---
<Base>
  <Hero />
</Base>
```

- [ ] **Step 11: Run all checks**

Run: `npm run verify`
Expected: all green; Playwright 10 passed (home 1, nav 3, contours 2, hero 4).

- [ ] **Step 12: Look at it and tune by eye**

Run: `npm run dev`, open `http://localhost:4321/`.
Expected: the placeholder silhouette centred at the bottom, the name spanning the full width across it (dark over the paper, light over the silhouette), the pitch top left, two buttons top right. Moving the pointer over the silhouette leaves a soft orange ribbon with the occasional small ink or paper droplet; it wobbles, then shrinks away within about three seconds. Outside the silhouette's box nothing is painted.

The feel is controlled by `WASH_DEFAULTS` in `src/lib/wash.ts` (`radius`, `spacing`, `life`) and by `opacity` on `.hero__wash`. Adjust only if the paint looks wrong; the unit tests pass explicit options, so changing defaults other than `radius` does not break them (the first wash test asserts the midpoint of the default radius range; update its expected `62` if you change `radius`).

- [ ] **Step 13: Commit**

```bash
git add src/lib/wash.ts src/scripts/hero-wash.ts src/scripts/main.ts src/components/sections/Hero.astro src/pages/index.astro tests/unit/wash.test.ts tests/e2e/hero.spec.ts
git commit -m "feat: add hero section with paint-wash pointer interaction" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Statement section

**Files:**
- Create: `src/lib/statement.ts`, `src/components/sections/Statement.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/unit/statement.test.ts`, `tests/e2e/statement.spec.ts`

**Interfaces:**
- Consumes: `getSite()` (`statement` and `marquee` strings, where `*word*` marks an accent); the `data-inview` attribute; the `.serif` and `.display` classes.
- Produces: `interface StatementToken { text: string; accent: boolean; tail: string }` and `parseStatement(source: string): StatementToken[]` in `src/lib/statement.ts`; `Statement.astro` (no props) rendering `<section class="statement section theme-ink">`.

- [ ] **Step 1: Write the failing unit test**

`tests/unit/statement.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { parseStatement } from '../../src/lib/statement';

describe('parseStatement', () => {
  test('splits plain text into words', () => {
    expect(parseStatement('I build things')).toEqual([
      { text: 'I', accent: false, tail: '' },
      { text: 'build', accent: false, tail: '' },
      { text: 'things', accent: false, tail: '' },
    ]);
  });

  test('marks words wrapped in asterisks as accents and keeps the punctuation after them outside the accent', () => {
    expect(parseStatement('systems that *ship*. I start')).toEqual([
      { text: 'systems', accent: false, tail: '' },
      { text: 'that', accent: false, tail: '' },
      { text: 'ship', accent: true, tail: '.' },
      { text: 'I', accent: false, tail: '' },
      { text: 'start', accent: false, tail: '' },
    ]);
  });

  test('an accent can span several words', () => {
    expect(parseStatement('the *business case* myself.')).toEqual([
      { text: 'the', accent: false, tail: '' },
      { text: 'business', accent: true, tail: '' },
      { text: 'case', accent: true, tail: '' },
      { text: 'myself.', accent: false, tail: '' },
    ]);
  });

  test('handles the real site statement', () => {
    const tokens = parseStatement(
      'I build AI systems that *ship*. I start with the *people* who will use them, *measure* before I claim, and make the *business case* myself.',
    );
    expect(tokens.filter((token) => token.accent).map((token) => token.text)).toEqual([
      'ship',
      'people',
      'measure',
      'business',
      'case',
    ]);
    expect(tokens.map((token) => token.text + token.tail).join(' ')).toBe(
      'I build AI systems that ship. I start with the people who will use them, measure before I claim, and make the business case myself.',
    );
  });

  test('rejects an unbalanced asterisk', () => {
    expect(() => parseStatement('a *broken accent')).toThrow('Unbalanced * in "a *broken accent"');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test`
Expected: FAIL, the import of `../../src/lib/statement` cannot be resolved.

- [ ] **Step 3: Implement the parser**

`src/lib/statement.ts`:

```ts
export interface StatementToken {
  /** One word. */
  text: string;
  /** True when the word was wrapped in *asterisks*. */
  accent: boolean;
  /** Punctuation that directly followed a closing asterisk; shown after the word, without the accent. */
  tail: string;
}

/** Splits copy like "systems that *ship*. I start" into words, marking the accented ones. */
export function parseStatement(source: string): StatementToken[] {
  if ((source.match(/\*/g) ?? []).length % 2 !== 0) throw new Error(`Unbalanced * in "${source}"`);

  const tokens: StatementToken[] = [];
  source.split('*').forEach((segment, index) => {
    const accent = index % 2 === 1;
    let rest = segment;

    // Plain text that starts without a space continues the previous word: the "." after "*ship*".
    if (!accent && tokens.length > 0) {
      const attached = rest.match(/^\S+/);
      if (attached) {
        tokens[tokens.length - 1].tail += attached[0];
        rest = rest.slice(attached[0].length);
      }
    }

    for (const word of rest.split(/\s+/).filter(Boolean)) tokens.push({ text: word, accent, tail: '' });
  });
  return tokens;
}
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npm run test`
Expected: PASS, including 5 statement tests.

- [ ] **Step 5: Write the failing end-to-end test**

`tests/e2e/statement.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('the statement reads as one sentence with its accent words emphasised', async ({ page }) => {
  await page.goto('/');
  const text = page.locator('.statement__text');
  await expect(text).toContainText(
    'I build AI systems that ship. I start with the people who will use them, measure before I claim, and make the business case myself.',
  );
  await expect(text.locator('em')).toHaveText(['ship', 'people', 'measure', 'business', 'case']);
});

test('the marquee line is read once by screen readers', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.statement .sr-only')).toHaveText('Direction before speed');
  await expect(page.locator('.marquee')).toHaveAttribute('aria-hidden', 'true');
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm run build && npx playwright test statement`
Expected: FAIL, `.statement__text` is not found.

- [ ] **Step 7: Write the statement section**

`src/components/sections/Statement.astro`:

```astro
---
import { getSite } from '../../lib/content';
import { parseStatement } from '../../lib/statement';

const site = await getSite();
const words = parseStatement(site.statement);
const marquee = parseStatement(site.marquee);
const marqueeText = marquee.map((word) => word.text + word.tail).join(' ');
---
<section class="statement section theme-ink">
  <p class="statement__text" data-inview>
    {words.map((word, index) => (
      <Fragment>
        <span class="statement__word" style={`--i:${index}`}>
          {word.accent ? <em class="serif">{word.text}</em> : word.text}{word.tail}
        </span>{' '}
      </Fragment>
    ))}
  </p>

  <div class="marquee" aria-hidden="true">
    <div class="marquee__track">
      {[0, 1, 2, 3].map(() => (
        <span class="marquee__item display">
          {marquee.map((word) => (word.accent ? <em class="serif">{word.text}{word.tail}</em> : <span>{word.text}{word.tail}</span>))}
          <span class="marquee__dot"></span>
        </span>
      ))}
    </div>
  </div>
  <p class="sr-only">{marqueeText}</p>
</section>

<style>
  .statement {
    text-align: center;
  }

  .statement__text {
    max-width: 22ch;
    margin-inline: auto;
    font-size: clamp(1.9rem, 1rem + 4.4vw, 5.25rem);
    font-weight: 800;
    font-stretch: 112%;
    line-height: 1.02;
    letter-spacing: -0.01em;
    text-transform: uppercase;
    text-wrap: balance;
  }

  .statement__text em {
    color: var(--accent);
    font-size: 1.14em;
    line-height: 0.9;
  }

  /* Words start dim and light up in order when the paragraph scrolls into view. */
  @media (prefers-reduced-motion: no-preference) {
    :global(.js) .statement__word {
      opacity: 0.14;
      transition: opacity 0.6s var(--ease);
      transition-delay: calc(var(--i) * 45ms);
    }

    :global(.js) .statement__text.is-in .statement__word {
      opacity: 1;
    }
  }

  .marquee {
    margin: var(--section-gap) calc(var(--gutter) * -1) 0;
    padding-block: clamp(1rem, 2vw, 2rem);
    overflow: hidden;
    border-block: 1px solid var(--line);
  }

  .marquee__track {
    display: flex;
    width: max-content;
  }

  .marquee__item {
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
    padding-right: 0.3em;
    font-size: clamp(3rem, 2rem + 8vw, 9.5rem);
    white-space: nowrap;
  }

  .marquee__item em {
    color: var(--accent);
    font-size: 1.1em;
  }

  .marquee__dot {
    flex: none;
    width: 0.26em;
    height: 0.26em;
    border-radius: 50%;
    background: var(--accent);
  }

  /* Four copies of the line; sliding by half the track loops seamlessly. */
  @media (prefers-reduced-motion: no-preference) {
    .marquee__track {
      animation: marquee 26s linear infinite;
    }
  }

  @keyframes marquee {
    to {
      transform: translateX(-50%);
    }
  }
</style>
```

- [ ] **Step 8: Add it to the home page**

Replace `src/pages/index.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/sections/Hero.astro';
import Statement from '../components/sections/Statement.astro';
---
<Base>
  <Hero />
  <Statement />
</Base>
```

- [ ] **Step 9: Run all checks**

Run: `npm run verify`
Expected: all green; Playwright 12 passed.

- [ ] **Step 10: Look at it**

Run: `npm run dev`. Expected: below the hero, a black section with a large centred uppercase paragraph whose accent words are orange serif italic and whose words light up in order as it scrolls into view; beneath it, "DIRECTION before SPEED" scrolling sideways with orange dots between repeats.

- [ ] **Step 11: Commit**

```bash
git add src/lib/statement.ts src/components/sections/Statement.astro src/pages/index.astro tests/unit/statement.test.ts tests/e2e/statement.spec.ts
git commit -m "feat: add statement section with accent words and marquee" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Selected work showcase

Four tabs, one per flagship project. Without JavaScript the tab buttons are hidden and all four projects are shown stacked.

**Files:**
- Create: `src/lib/tabs.ts`, `src/scripts/showcase.ts`, `src/components/sections/Work.astro`
- Modify: `src/scripts/main.ts` (register the island), `src/pages/index.astro`
- Test: `tests/unit/tabs.test.ts`, `tests/e2e/work.spec.ts`

**Interfaces:**
- Consumes: `getFlagship()`; `asset()`; `Button.astro`; the `islands` registry.
- Produces: `nextTabIndex(key: string, current: number, count: number): number | null` in `src/lib/tabs.ts`; `mount(root: HTMLElement): void` in `src/scripts/showcase.ts`, which sets `data-enhanced="true"` on `root`; `Work.astro` (no props) rendering `<section class="work section theme-paper" id="work" data-island="showcase">`.

- [ ] **Step 1: Write the failing unit test**

`tests/unit/tabs.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { nextTabIndex } from '../../src/lib/tabs';

describe('nextTabIndex', () => {
  test('arrow right moves forward and wraps to the first tab', () => {
    expect(nextTabIndex('ArrowRight', 0, 4)).toBe(1);
    expect(nextTabIndex('ArrowRight', 3, 4)).toBe(0);
  });

  test('arrow left moves back and wraps to the last tab', () => {
    expect(nextTabIndex('ArrowLeft', 2, 4)).toBe(1);
    expect(nextTabIndex('ArrowLeft', 0, 4)).toBe(3);
  });

  test('home and end jump to the first and last tab', () => {
    expect(nextTabIndex('Home', 2, 4)).toBe(0);
    expect(nextTabIndex('End', 1, 4)).toBe(3);
  });

  test('other keys are ignored', () => {
    expect(nextTabIndex('Enter', 1, 4)).toBeNull();
    expect(nextTabIndex('a', 1, 4)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test`
Expected: FAIL, the import of `../../src/lib/tabs` cannot be resolved.

- [ ] **Step 3: Implement it**

`src/lib/tabs.ts`:

```ts
/** Index of the tab a key press should move to, or null when the key does not navigate tabs. */
export function nextTabIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npm run test`
Expected: PASS, including 4 tab tests.

- [ ] **Step 5: Write the failing end-to-end test**

`tests/e2e/work.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test.describe('selected work', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#work').scrollIntoViewIfNeeded();
    await expect(page.locator('#work')).toHaveAttribute('data-enhanced', 'true');
  });

  test('shows one project at a time and switches on click', async ({ page }) => {
    const section = page.locator('#work');
    await expect(section.getByRole('tab')).toHaveCount(4);
    await expect(section.getByRole('tabpanel')).toHaveCount(1);
    await expect(section.getByRole('heading', { name: 'Case Closed' })).toBeVisible();

    await section.getByRole('tab', { name: /Orbit/ }).click();
    await expect(section.getByRole('heading', { name: 'Orbit' })).toBeVisible();
    await expect(section.getByRole('heading', { name: 'Case Closed' })).toBeHidden();
  });

  test('arrow keys move between tabs and wrap around', async ({ page }) => {
    const section = page.locator('#work');
    await section.getByRole('tab', { name: /Case Closed/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(section.getByRole('tab', { name: /Orbit/ })).toBeFocused();
    await expect(section.getByRole('tab', { name: /Orbit/ })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(section.getByRole('tab', { name: /GPU Portfolio Engine/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('the visible project links to its case study, and the section links to all work', async ({ page }) => {
    const section = page.locator('#work');
    await expect(section.getByRole('link', { name: 'Read the case study' })).toHaveAttribute('href', '/work/case-closed');
    await expect(section.getByRole('link', { name: 'All work' })).toHaveAttribute('href', '/work');
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm run build && npx playwright test work`
Expected: FAIL, `#work` is not found.

- [ ] **Step 7: Write the tab behaviour**

`src/scripts/showcase.ts`:

```ts
import { nextTabIndex } from '../lib/tabs';

export function mount(root: HTMLElement): void {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  if (tabs.length === 0 || tabs.length !== panels.length) return;

  const select = (index: number, moveFocus: boolean) => {
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
    if (moveFocus) tabs[index].focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(index, false));
    tab.addEventListener('keydown', (event) => {
      const next = nextTabIndex(event.key, index, tabs.length);
      if (next === null) return;
      event.preventDefault();
      select(next, true);
    });
  });

  select(0, false);
  root.dataset.enhanced = 'true';
}
```

In `src/scripts/main.ts`, add one line to the `islands` object so it reads:

```ts
const islands: Partial<Record<string, () => Promise<Island>>> = {
  'hero-wash': () => import('./hero-wash'),
  showcase: () => import('./showcase'),
};
```

- [ ] **Step 8: Write the section**

`src/components/sections/Work.astro`:

```astro
---
import { Image } from 'astro:assets';
import Button from '../Button.astro';
import { asset } from '../../lib/assets';
import { getFlagship } from '../../lib/content';

const projects = await getFlagship();
---
<section class="work section theme-paper" id="work" data-island="showcase">
  <header class="section__head">
    <h2 class="label">Selected work</h2>
    <a class="label" href="/work">All work</a>
  </header>

  <div class="work__tabs" role="tablist" aria-label="Selected work">
    {projects.map((project, index) => (
      <button
        class="work__tab"
        type="button"
        role="tab"
        id={`tab-${project.id}`}
        aria-controls={`panel-${project.id}`}
        aria-selected={index === 0 ? 'true' : 'false'}
        tabindex={index === 0 ? 0 : -1}
      >
        <span class="work__num">{String(index + 1).padStart(2, '0')}</span>{' '}{project.data.short}
      </button>
    ))}
  </div>

  {projects.map((project) => (
    <article class="work__panel" role="tabpanel" id={`panel-${project.id}`} aria-labelledby={`tab-${project.id}`}>
      <div class="work__info">
        <h3 class="work__title display">{project.data.title}</h3>
        <p class="work__tagline serif">{project.data.tagline}</p>
        <p class="work__summary">{project.data.summary}</p>
        <ul class="work__proof">
          {project.data.proof.map((point) => <li>{point}</li>)}
        </ul>
        <p class="work__status label">{project.data.status}</p>
        <Button href={`/work/${project.id}`}>Read the case study</Button>
      </div>
      <div class="work__stage">
        <Image
          src={asset(`work/${project.data.cover}`)}
          alt={`${project.data.title} screenshot`}
          widths={[640, 960, 1280, 1600]}
          sizes="(max-width: 800px) 92vw, 56vw"
          loading="lazy"
        />
      </div>
    </article>
  ))}
</section>

<style>
  .work__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem clamp(1rem, 2.4vw, 2.5rem);
    margin-bottom: clamp(2rem, 4vw, 3.5rem);
  }

  /* The tab buttons do nothing without scripts, so they are hidden until main.ts has run. */
  :global(html:not(.js)) .work__tabs {
    display: none;
  }

  .work__tab {
    padding: 0.35rem 0;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    color: var(--muted);
    font-size: clamp(0.8rem, 0.7rem + 0.5vw, 1.05rem);
    font-weight: 900;
    font-stretch: 125%;
    text-transform: uppercase;
    cursor: pointer;
  }

  .work__tab[aria-selected='true'] {
    border-bottom-color: var(--accent);
    color: var(--fg);
  }

  .work__num {
    font-size: 0.6875rem;
    font-weight: 600;
    font-stretch: 100%;
  }

  .work__panel {
    display: grid;
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    align-items: end;
    gap: clamp(1.5rem, 4vw, 4rem);
  }

  .work__panel[hidden] {
    display: none;
  }

  /* With scripts but before the tabs are wired up, show only the first project so nothing jumps. */
  :global(.js) .work:not([data-enhanced]) .work__panel:not(:first-of-type) {
    display: none;
  }

  /* Without scripts every project is shown, stacked. */
  :global(html:not(.js)) .work__panel + .work__panel {
    margin-top: var(--section-gap);
  }

  .work__info {
    display: grid;
    justify-items: start;
    gap: 1rem;
  }

  .work__title {
    font-size: clamp(2.2rem, 1.2rem + 4.6vw, 5.25rem);
    overflow-wrap: anywhere;
  }

  .work__tagline {
    color: var(--accent);
    font-size: clamp(1.4rem, 1.1rem + 1.2vw, 2.2rem);
    line-height: 1.1;
  }

  .work__summary {
    max-width: 42ch;
    font-size: clamp(1rem, 0.95rem + 0.3vw, 1.2rem);
  }

  .work__proof {
    display: grid;
    gap: 0.4rem;
    width: 100%;
    padding-block: 0.75rem;
    border-block: 1px solid var(--line);
    font-weight: 700;
  }

  .work__status {
    color: var(--muted);
  }

  .work__stage {
    overflow: hidden;
    aspect-ratio: 16 / 10;
    border-radius: var(--radius);
    background: var(--line);
  }

  .work__stage :global(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  @media (prefers-reduced-motion: no-preference) {
    .work__panel:not([hidden]) .work__stage {
      animation: stage-in 0.6s var(--ease);
    }
  }

  @keyframes stage-in {
    from {
      opacity: 0;
      transform: translateY(1rem) scale(0.985);
    }
  }

  @media (max-width: 800px) {
    .work__panel {
      grid-template-columns: minmax(0, 1fr);
    }

    .work__stage {
      order: -1;
    }
  }
</style>
```

- [ ] **Step 9: Add it to the home page**

Replace `src/pages/index.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/sections/Hero.astro';
import Statement from '../components/sections/Statement.astro';
import Work from '../components/sections/Work.astro';
---
<Base>
  <Hero />
  <Statement />
  <Work />
</Base>
```

- [ ] **Step 10: Run all checks**

Run: `npm run verify`
Expected: all green; Playwright 15 passed. The "Read the case study" link points at a page that does not exist until Task 12; that is expected here.

- [ ] **Step 11: Commit**

```bash
git add src/lib/tabs.ts src/scripts/showcase.ts src/scripts/main.ts src/components/sections/Work.astro src/pages/index.astro tests/unit/tabs.test.ts tests/e2e/work.spec.ts
git commit -m "feat: add selected-work showcase with accessible tabs" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Numbers section

**Files:**
- Create: `src/lib/count.ts`, `src/scripts/numbers.ts`, `src/components/sections/Numbers.astro`
- Modify: `src/scripts/main.ts` (register the island), `src/pages/index.astro`
- Test: `tests/unit/count.test.ts`, `tests/e2e/numbers.spec.ts`

**Interfaces:**
- Consumes: `getNumbers()`; `ContourBg.astro`; the `islands` registry.
- Produces: `interface ParsedNumeral { prefix: string; value: number; suffix: string; grouped: boolean }`, `parseNumeral(text: string): ParsedNumeral | null` and `formatNumeral(parsed: ParsedNumeral, progress: number): string` in `src/lib/count.ts`; `mount(root: HTMLElement): void` in `src/scripts/numbers.ts`; `Numbers.astro` (no props) rendering `<section class="numbers section theme-ink" data-island="numbers">` where each numeral element carries `data-count="<final text>"`. The script sets `data-counted="true"` on a numeral when its count-up finishes.

- [ ] **Step 1: Write the failing unit test**

`tests/unit/count.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { formatNumeral, parseNumeral, type ParsedNumeral } from '../../src/lib/count';

const parsed = (text: string): ParsedNumeral => {
  const result = parseNumeral(text);
  if (!result) throw new Error(`"${text}" has no number`);
  return result;
};

describe('parseNumeral', () => {
  test('finds a plain number with a suffix', () => {
    expect(parseNumeral('60+')).toEqual({ prefix: '', value: 60, suffix: '+', grouped: false });
  });

  test('reads thousands separators as part of the number', () => {
    expect(parseNumeral('1,100+')).toEqual({ prefix: '', value: 1100, suffix: '+', grouped: true });
  });

  test('treats letters after the number as suffix', () => {
    expect(parseNumeral('9M+')).toEqual({ prefix: '', value: 9, suffix: 'M+', grouped: false });
  });

  test('counts the last number when there are several', () => {
    expect(parseNumeral('1st of 220+')).toEqual({ prefix: '1st of ', value: 220, suffix: '+', grouped: false });
  });

  test('returns null when there is no number', () => {
    expect(parseNumeral('many')).toBeNull();
  });
});

describe('formatNumeral', () => {
  test.each(['220+', '60+', '9M+', '1,100+', '4'])('%s is reproduced exactly at full progress', (text) => {
    expect(formatNumeral(parsed(text), 1)).toBe(text);
  });

  test('starts from zero', () => {
    expect(formatNumeral(parsed('1,100+'), 0)).toBe('0+');
  });

  test('shows a rounded, grouped value part-way', () => {
    expect(formatNumeral(parsed('1,100+'), 0.5)).toBe('550+');
    expect(formatNumeral(parsed('1,100+'), 0.999)).toBe('1,099+');
  });

  test('clamps progress outside 0 to 1', () => {
    expect(formatNumeral(parsed('60+'), -1)).toBe('0+');
    expect(formatNumeral(parsed('60+'), 2)).toBe('60+');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test`
Expected: FAIL, the import of `../../src/lib/count` cannot be resolved.

- [ ] **Step 3: Implement it**

`src/lib/count.ts`:

```ts
export interface ParsedNumeral {
  /** Text before the number. */
  prefix: string;
  value: number;
  /** Text after the number. */
  suffix: string;
  /** True when the number was written with thousands separators. */
  grouped: boolean;
}

/** Splits a numeral such as "1,100+" around its last number, so that number can be counted up. */
export function parseNumeral(text: string): ParsedNumeral | null {
  const matches = Array.from(text.matchAll(/\d{1,3}(?:,\d{3})+|\d+/g));
  const last = matches[matches.length - 1];
  if (!last) return null;
  const digits = last[0];
  return {
    prefix: text.slice(0, last.index),
    value: Number(digits.replaceAll(',', '')),
    suffix: text.slice(last.index + digits.length),
    grouped: digits.includes(','),
  };
}

/** The numeral as it reads at `progress` (0 to 1) of its count-up. */
export function formatNumeral(parsed: ParsedNumeral, progress: number): string {
  const current = Math.round(parsed.value * Math.min(1, Math.max(0, progress)));
  const shown = parsed.grouped ? current.toLocaleString('en-US') : String(current);
  return `${parsed.prefix}${shown}${parsed.suffix}`;
}
```

- [ ] **Step 4: Run the unit tests to verify they pass**

Run: `npm run test`
Expected: PASS, including 13 count tests.

- [ ] **Step 5: Write the failing end-to-end test**

`tests/e2e/numbers.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('each numeral counts up to its final text and has a caption', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('.numbers');
  for (const numeral of ['220+', '60+', '9M+', '1,100+', '4']) {
    const el = section.locator(`[data-count="${numeral}"]`);
    await el.scrollIntoViewIfNeeded();
    await expect(el).toHaveAttribute('data-counted', 'true'); // the count-up ran to the end
    await expect(el).toHaveText(numeral);
  }
  await expect(section.getByText('Solutions Architects interviewed at AWS before building')).toBeVisible();
  await expect(section.locator('.numbers__item')).toHaveCount(5);
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm run build && npx playwright test numbers`
Expected: FAIL, `.numbers` is not found.

- [ ] **Step 7: Write the count-up behaviour**

`src/scripts/numbers.ts`:

```ts
import { formatNumeral, parseNumeral } from '../lib/count';

const DURATION_MS = 1400;

function countUp(el: HTMLElement): void {
  const parsed = parseNumeral(el.dataset.count ?? '');
  if (!parsed) return;
  const start = performance.now();
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / DURATION_MS);
    el.textContent = formatNumeral(parsed, 1 - (1 - t) ** 3); // ease-out
    if (t < 1) requestAnimationFrame(frame);
    else el.dataset.counted = 'true';
  };
  requestAnimationFrame(frame);
}

export function mount(root: HTMLElement): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        countUp(entry.target as HTMLElement);
      }
    },
    { threshold: 0.6 },
  );
  root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => observer.observe(el));
}
```

In `src/scripts/main.ts`, add one line to the `islands` object so it reads:

```ts
const islands: Partial<Record<string, () => Promise<Island>>> = {
  'hero-wash': () => import('./hero-wash'),
  showcase: () => import('./showcase'),
  numbers: () => import('./numbers'),
};
```

- [ ] **Step 8: Write the section**

`src/components/sections/Numbers.astro`:

```astro
---
import ContourBg from '../ContourBg.astro';
import { getNumbers } from '../../lib/content';

const numbers = await getNumbers();
---
<section class="numbers section theme-ink" data-island="numbers">
  <ContourBg />
  <header class="section__head">
    <h2 class="label">By the numbers</h2>
  </header>
  <ul class="numbers__list">
    {numbers.map((item) => (
      <li class="numbers__item">
        <p class="numbers__numeral display" data-count={item.data.numeral}>{item.data.numeral}</p>
        <p class="numbers__caption">{item.data.caption}</p>
      </li>
    ))}
  </ul>
</section>

<style>
  .numbers__item {
    display: grid;
    gap: 0.5rem;
    padding-block: clamp(1.25rem, 3vw, 2.5rem);
    border-top: 1px solid var(--line);
  }

  .numbers__numeral {
    font-size: clamp(3.5rem, 1rem + 12.5vw, 13rem);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .numbers__item:first-child .numbers__numeral {
    color: var(--accent);
  }

  .numbers__caption {
    max-width: 34ch;
    color: var(--muted);
    font-size: clamp(1rem, 0.9rem + 0.5vw, 1.35rem);
  }

  @media (min-width: 800px) {
    .numbers__item {
      grid-template-columns: minmax(0, 3fr) minmax(0, 1fr);
      align-items: end;
    }

    .numbers__caption {
      justify-self: end;
      text-align: right;
    }
  }

  /* Numerals grow as they scroll into view, where the browser supports scroll-driven animation. */
  @supports (animation-timeline: view()) {
    @media (prefers-reduced-motion: no-preference) {
      .numbers__numeral {
        transform-origin: left bottom;
        animation: numeral-grow linear both;
        animation-timeline: view();
        animation-range: entry 0% cover 45%;
      }

      @keyframes numeral-grow {
        from {
          opacity: 0.35;
          transform: scale(0.72);
        }

        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    }
  }
</style>
```

- [ ] **Step 9: Add it to the home page**

Replace `src/pages/index.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/sections/Hero.astro';
import Statement from '../components/sections/Statement.astro';
import Work from '../components/sections/Work.astro';
import Numbers from '../components/sections/Numbers.astro';
---
<Base>
  <Hero />
  <Statement />
  <Work />
  <Numbers />
</Base>
```

- [ ] **Step 10: Run all checks**

Run: `npm run verify`
Expected: all green; Playwright 16 passed.

- [ ] **Step 11: Commit**

```bash
git add src/lib/count.ts src/scripts/numbers.ts src/scripts/main.ts src/components/sections/Numbers.astro src/pages/index.astro tests/unit/count.test.ts tests/e2e/numbers.spec.ts
git commit -m "feat: add numbers section with count-up numerals" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Experience and About sections

**Files:**
- Create: `src/components/sections/Experience.astro`, `src/components/sections/About.astro`
- Modify: `src/pages/index.astro`
- Test: `tests/e2e/about.spec.ts`

**Interfaces:**
- Consumes: `getExperience()`, `getEducation()`, `getAbout()`; `asset('collage/<file>')`; the `data-reveal` attribute.
- Produces: `Experience.astro` (no props) rendering `<section class="xp section theme-paper" id="experience">`; `About.astro` (no props) rendering `<section class="about section theme-ink" id="about">`.

- [ ] **Step 1: Write the failing end-to-end test**

`tests/e2e/about.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('experience lists five roles and two schools', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#experience');
  await expect(section.locator('.xp__list--roles .xp__row')).toHaveCount(5);
  await expect(section.getByRole('heading', { name: 'Amazon Web Services' })).toBeVisible();
  await expect(section.getByText('Solutions Architect Intern')).toBeVisible();
  await expect(section.getByText('Arlington, VA · May–Aug 2026')).toBeVisible();
  await expect(section.locator('.xp__list--schools .xp__row')).toHaveCount(2);
  await expect(section.getByText('Graduating May 2028')).toBeVisible();
  await expect(section.getByRole('link', { name: 'Full resume' })).toHaveAttribute('href', '/resume');
});

test('about shows the bio, four numbered facts, interests and six collage images', async ({ page }) => {
  await page.goto('/');
  const section = page.locator('#about');
  await expect(section.getByRole('heading', { name: "I'm Jason." })).toBeVisible();
  await expect(section.getByText('I co-founded Case Closed')).toBeVisible();
  await expect(section.locator('.about__facts li')).toHaveCount(4);
  await expect(section.locator('.about__facts li').first()).toContainText('Eagle Scout');
  await expect(section.getByText('Hip-hop and playlist curation')).toBeVisible();
  await expect(section.locator('.about__photo img')).toHaveCount(6);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build && npx playwright test about`
Expected: FAIL, `#experience` and `#about` are not found.

- [ ] **Step 3: Write the experience section**

`src/components/sections/Experience.astro`:

```astro
---
import { getEducation, getExperience } from '../../lib/content';

const [roles, schools] = await Promise.all([getExperience(), getEducation()]);
---
<section class="xp section theme-paper" id="experience">
  <header class="section__head">
    <h2 class="label">Experience</h2>
    <a class="label" href="/resume">Full resume</a>
  </header>
  <ol class="xp__list xp__list--roles">
    {roles.map((item, index) => (
      <li class="xp__row" data-reveal style={`--i:${index % 3}`}>
        <h3 class="xp__org display">{item.data.org}</h3>
        <p class="xp__role">{item.data.role}</p>
        <p class="xp__meta label">{[item.data.place, item.data.dates].filter(Boolean).join(' · ')}</p>
        <p class="xp__summary">{item.data.summary}</p>
      </li>
    ))}
  </ol>

  <h2 class="xp__sub label">Education</h2>
  <ul class="xp__list xp__list--schools">
    {schools.map((item) => (
      <li class="xp__row" data-reveal>
        <h3 class="xp__org display">{item.data.school}</h3>
        <p class="xp__role">{item.data.detail}</p>
        <p class="xp__meta label">{item.data.dates}</p>
      </li>
    ))}
  </ul>
</section>

<style>
  .xp__list {
    border-bottom: 1px solid var(--line);
  }

  .xp__row {
    display: grid;
    gap: 0.35rem 2rem;
    padding-block: clamp(1.1rem, 2.2vw, 1.9rem);
    border-top: 1px solid var(--line);
  }

  .xp__org {
    font-size: clamp(1.25rem, 1rem + 1.4vw, 2.25rem);
    overflow-wrap: anywhere;
  }

  .xp__role {
    font-weight: 700;
  }

  .xp__meta,
  .xp__summary {
    color: var(--muted);
  }

  .xp__summary {
    max-width: 62ch;
  }

  .xp__sub {
    margin: clamp(2.5rem, 5vw, 4.5rem) 0 1rem;
    color: var(--muted);
  }

  @media (min-width: 900px) {
    .xp__row {
      grid-template-columns: minmax(0, 4fr) minmax(0, 3fr) minmax(0, 5fr);
      grid-template-areas:
        'org role summary'
        'org meta summary';
    }

    .xp__org {
      grid-area: org;
    }

    .xp__role {
      grid-area: role;
    }

    .xp__meta {
      grid-area: meta;
    }

    .xp__summary {
      grid-area: summary;
    }
  }
</style>
```

- [ ] **Step 4: Write the about section**

`src/components/sections/About.astro`:

```astro
---
import { Image } from 'astro:assets';
import { asset } from '../../lib/assets';
import { getAbout } from '../../lib/content';

const about = await getAbout();
---
<section class="about section theme-ink" id="about">
  <header class="section__head">
    <h2 class="label">About</h2>
  </header>
  <div class="about__grid">
    <div class="about__copy">
      <h3 class="about__heading display">{about.heading}</h3>
      <p class="about__bio">{about.bio}</p>
      <ol class="about__facts">
        {about.facts.map((fact, index) => (
          <li data-reveal style={`--i:${index}`}>
            <span class="label">{String(index + 1).padStart(2, '0')}</span>
            <span>{fact}</span>
          </li>
        ))}
      </ol>
      <p class="about__interests-label label">Outside work</p>
      <p class="about__interests">{about.interests.join(' · ')}</p>
    </div>
    <div class="about__collage">
      {about.collage.map((photo, index) => (
        <figure class:list={['about__photo', `about__photo--${index + 1}`]}>
          <Image
            src={asset(`collage/${photo.file}`)}
            alt={photo.caption ?? ''}
            widths={[320, 480, 640, 960]}
            sizes="(max-width: 960px) 46vw, 26vw"
            loading="lazy"
          />
          {photo.caption && <figcaption class="label">{photo.caption}</figcaption>}
        </figure>
      ))}
    </div>
  </div>
</section>

<style>
  .about__grid {
    display: grid;
    gap: clamp(2.5rem, 6vw, 6rem);
  }

  @media (min-width: 960px) {
    .about__grid {
      grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
      align-items: start;
    }
  }

  .about__heading {
    margin-bottom: 1.5rem;
    font-size: clamp(2.5rem, 1.5rem + 5vw, 6rem);
  }

  .about__bio {
    max-width: 46ch;
    font-size: clamp(1.05rem, 0.95rem + 0.5vw, 1.4rem);
  }

  .about__facts {
    margin-top: 2.5rem;
    border-bottom: 1px solid var(--line);
  }

  .about__facts li {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr);
    gap: 1rem;
    padding-block: 1rem;
    border-top: 1px solid var(--line);
    font-size: clamp(0.95rem, 0.85rem + 0.5vw, 1.25rem);
    font-weight: 800;
    font-stretch: 110%;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .about__facts .label {
    padding-top: 0.3em;
    color: var(--muted);
  }

  .about__interests-label {
    margin-top: 2.5rem;
    color: var(--muted);
  }

  .about__interests {
    max-width: 46ch;
    margin-top: 0.5rem;
  }

  /* A scattered collage: six photos on a six-column grid, each nudged off the row. */
  .about__collage {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    align-items: start;
    gap: clamp(0.75rem, 2vw, 1.5rem);
  }

  .about__photo {
    --shift: 0px;
  }

  .about__photo :global(img) {
    width: 100%;
    height: auto;
    border-radius: calc(var(--radius) / 2);
  }

  .about__photo figcaption {
    margin-top: 0.5rem;
    color: var(--muted);
  }

  .about__photo--1 {
    grid-column: 1 / span 3;
  }

  .about__photo--2 {
    grid-column: 4 / span 3;
    margin-top: 30%;
    --shift: -40px;
  }

  .about__photo--3 {
    grid-column: 2 / span 2;
    --shift: 30px;
  }

  .about__photo--4 {
    grid-column: 4 / span 3;
    --shift: -20px;
  }

  .about__photo--5 {
    grid-column: 1 / span 4;
    --shift: 24px;
  }

  .about__photo--6 {
    grid-column: 5 / span 2;
    --shift: -36px;
  }

  /* Each photo drifts a little against the scroll, where the browser supports scroll-driven animation. */
  @supports (animation-timeline: view()) {
    @media (prefers-reduced-motion: no-preference) {
      .about__photo {
        animation: photo-drift linear both;
        animation-timeline: view();
      }

      @keyframes photo-drift {
        from {
          transform: translateY(calc(var(--shift) * -1));
        }

        to {
          transform: translateY(var(--shift));
        }
      }
    }
  }
</style>
```

- [ ] **Step 5: Add both to the home page**

Replace `src/pages/index.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/sections/Hero.astro';
import Statement from '../components/sections/Statement.astro';
import Work from '../components/sections/Work.astro';
import Numbers from '../components/sections/Numbers.astro';
import Experience from '../components/sections/Experience.astro';
import About from '../components/sections/About.astro';
---
<Base>
  <Hero />
  <Statement />
  <Work />
  <Numbers />
  <Experience />
  <About />
</Base>
```

- [ ] **Step 6: Run all checks and commit**

Run: `npm run verify`
Expected: all green; Playwright 18 passed.

```bash
git add src/components/sections/Experience.astro src/components/sections/About.astro src/pages/index.astro tests/e2e/about.spec.ts
git commit -m "feat: add experience and about sections" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Contact footer on every page

**Files:**
- Create: `src/lib/resume-pdf.ts`, `src/components/sections/Contact.astro`
- Modify: `src/layouts/Base.astro`
- Test: `tests/e2e/contact.spec.ts`; replace `tests/e2e/home.spec.ts`

**Interfaces:**
- Consumes: `getSite()`; `Button.astro`; `ContourBg.astro`; the `data-fit` attribute.
- Produces: `resumePdfUrl: string | null` in `src/lib/resume-pdf.ts` (`'/jason-pereira-resume.pdf'` when `public/jason-pereira-resume.pdf` exists, otherwise `null`); `Contact.astro` (no props) rendering `<footer class="footer theme-paper" id="contact">`, included by `Base.astro` after `<main>` on every page.

- [ ] **Step 1: Write the failing end-to-end tests**

`tests/e2e/contact.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

test('the footer shows the email as a mail link, the profile buttons and the copyright', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer#contact');
  await expect(footer.getByRole('link', { name: 'jasonpereira518@gmail.com' })).toHaveAttribute(
    'href',
    'mailto:jasonpereira518@gmail.com',
  );
  await expect(footer.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
    'href',
    'https://linkedin.com/in/jasonpereira518',
  );
  await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
    'href',
    'https://github.com/jasonpereira518',
  );
  await expect(footer.getByRole('link', { name: 'Google Scholar' })).toHaveAttribute('href', /scholar\.google\.com/);
  await expect(footer.getByText(/^© \d{4} Jason Pereira$/)).toBeVisible();
});

test('the email line is fitted to the width of the panel', async ({ page }) => {
  await page.goto('/');
  const email = page.locator('.footer__email');
  await expect(email).toHaveAttribute('style', /--fit:\s*[\d.]+/);
  const ratio = await email.evaluate((el) => {
    const inner = el.firstElementChild;
    return inner ? inner.getBoundingClientRect().width / el.clientWidth : 0;
  });
  expect(ratio).toBeGreaterThan(0.98);
  expect(ratio).toBeLessThan(1.01);
});
```

Replace `tests/e2e/home.spec.ts` with:

```ts
import { expect, test } from '@playwright/test';

test('home page shows the name as its only main heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Jason Pereira' })).toBeVisible();
});

test('home page sections appear in the designed order', async ({ page }) => {
  await page.goto('/');
  const order = await page
    .locator('main > section, body > footer')
    .evaluateAll((elements) => elements.map((element) => element.classList[0]));
  expect(order).toEqual(['hero', 'statement', 'work', 'numbers', 'xp', 'about', 'footer']);
});

test('the page has a title and a description', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Jason Pereira');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /AI engineer who ships/);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm run build && npx playwright test contact home`
Expected: FAIL, `footer#contact` is not found and the section order lacks `footer`.

- [ ] **Step 3: Write the resume PDF helper**

`src/lib/resume-pdf.ts`:

```ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const FILE = 'jason-pereira-resume.pdf';

/** Public URL of the resume PDF, or null until the file has been added to `public/`. */
export const resumePdfUrl: string | null = existsSync(join(process.cwd(), 'public', FILE)) ? `/${FILE}` : null;
```

- [ ] **Step 4: Write the footer**

`src/components/sections/Contact.astro`:

```astro
---
import Button from '../Button.astro';
import ContourBg from '../ContourBg.astro';
import { getSite } from '../../lib/content';

const site = await getSite();
const year = new Date().getFullYear();
---
<footer class="footer theme-paper" id="contact">
  <div class="footer__panel theme-ink">
    <ContourBg />
    <h2 class="footer__label label">Say hi</h2>
    <a class="footer__email display" href={`mailto:${site.email}`} data-fit><span>{site.email}</span></a>
    <div class="footer__actions">
      <Button href={`mailto:${site.email}`} variant="solid">Email</Button>
      <Button href={site.links.linkedin} external>LinkedIn</Button>
      <Button href={site.links.github} external>GitHub</Button>
      <Button href={site.links.scholar} external>Google Scholar</Button>
      <Button href="/resume">Resume</Button>
    </div>
    <div class="footer__meta label">
      <p>© {year} {site.name}</p>
      <nav aria-label="Footer">
        <a href="/">Home</a>
        <a href="/work">Work</a>
        <a href="/resume">Resume</a>
      </nav>
    </div>
  </div>
</footer>

<style>
  .footer {
    padding: var(--gutter);
  }

  .footer__panel {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    display: grid;
    gap: clamp(1.5rem, 3vw, 3rem);
    padding: clamp(2rem, 5vw, 5rem) clamp(1.25rem, 4vw, 4rem) clamp(1.25rem, 2.5vw, 2rem);
    border-radius: var(--radius);
  }

  .footer__label {
    color: var(--muted);
  }

  .footer__email {
    --fit-base: 3.6vw;
    text-decoration: none;
    transition: color 0.25s var(--ease);
  }

  .footer__email:hover {
    color: var(--accent);
  }

  .footer__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .footer__meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.75rem 2rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--line);
    color: var(--muted);
  }

  .footer__meta nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.25rem;
  }

  .footer__meta a {
    text-decoration: none;
  }

  .footer__meta a:hover {
    color: var(--fg);
  }
</style>
```

- [ ] **Step 5: Render the footer from the layout**

In `src/layouts/Base.astro`, add this import below the `Nav` import:

```astro
import Contact from '../components/sections/Contact.astro';
```

and add `<Contact />` on the line after `</main>`, so the body reads:

```astro
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <Nav />
    <main id="main">
      <slot />
    </main>
    <Contact />
    <script>
      import '../scripts/main.ts';
    </script>
  </body>
```

- [ ] **Step 6: Run all checks and commit**

Run: `npm run verify`
Expected: all green; Playwright 22 passed.

```bash
git add src/lib/resume-pdf.ts src/components/sections/Contact.astro src/layouts/Base.astro tests/e2e/contact.spec.ts tests/e2e/home.spec.ts
git commit -m "feat: add contact footer to every page" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Work index and case-study pages

**Files:**
- Create: `src/components/ProjectCard.astro`, `src/pages/work/index.astro`, `src/pages/work/[slug].astro`
- Test: `tests/e2e/work-pages.spec.ts`

**Interfaces:**
- Consumes: `getFlagship()`, `getCardsByGroup()`, the `Flagship` type; `asset()`, `assetsIn()`; `Base.astro`; `render` from `astro:content`.
- Produces: `ProjectCard.astro` with props `{ project: CollectionEntry<'projects'> }`; the routes `/work` and `/work/<id>` for the four flagship ids `case-closed`, `orbit`, `streetlab`, `gpu-portfolio-engine`.

- [ ] **Step 1: Write the failing end-to-end test**

`tests/e2e/work-pages.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const flagship = [
  { slug: 'case-closed', title: 'Case Closed', next: 'orbit' },
  { slug: 'orbit', title: 'Orbit', next: 'streetlab' },
  { slug: 'streetlab', title: 'StreetLab', next: 'gpu-portfolio-engine' },
  { slug: 'gpu-portfolio-engine', title: 'GPU Portfolio & Risk Decision Engine', next: 'case-closed' },
];

test('the work index lists all 17 projects in their groups', async ({ page }) => {
  await page.goto('/work');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Everything I've built.");
  await expect(page.locator('.feature')).toHaveCount(4);
  await expect(page.locator('.card')).toHaveCount(13);
  for (const group of ['Quant and fintech', 'Full-stack and client work', 'Mobile', 'Hackathons', 'Hardware']) {
    await expect(page.getByRole('heading', { name: group, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'CAT-45' })).toBeVisible();
});

test('a flagship card on the index opens its case study', async ({ page }) => {
  await page.goto('/work');
  await page.locator('.feature', { hasText: 'Orbit' }).click();
  await expect(page).toHaveURL(/\/work\/orbit\/?$/);
});

for (const project of flagship) {
  test(`case study: ${project.title}`, async ({ page }) => {
    await page.goto(`/work/${project.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(project.title);
    for (const term of ['Role', 'Year', 'Status', 'Stack', 'Links']) {
      await expect(page.locator('.case__credits dt', { hasText: term })).toHaveCount(1);
    }
    for (const block of ['Problem', 'What I built', 'Result']) {
      await expect(page.locator('.case__blocks').getByRole('heading', { name: block, exact: true })).toBeVisible();
    }
    await expect(page.locator('.case__next')).toHaveAttribute('href', `/work/${project.next}`);
  });
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build && npx playwright test work-pages`
Expected: FAIL, `/work` returns the 404 response.

- [ ] **Step 3: Write the project card**

`src/components/ProjectCard.astro`:

```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  project: CollectionEntry<'projects'>;
}

const { data } = Astro.props.project;
---
<article class="card">
  <h3 class="card__title display">{data.title}</h3>
  <p class="card__meta label">{[data.role, data.dates].filter(Boolean).join(' · ')}</p>
  <p class="card__summary">{data.summary}</p>
  <p class="card__status label">{data.status}</p>
  {data.links.length > 0 && (
    <ul class="card__links">
      {data.links.map((link) => (
        <li>
          <a href={link.href} target="_blank" rel="noopener">{link.label}</a>
        </li>
      ))}
    </ul>
  )}
</article>

<style>
  .card {
    display: grid;
    align-content: start;
    gap: 0.5rem;
    padding-block: clamp(1.25rem, 2.5vw, 2rem);
    border-bottom: 1px solid var(--line);
  }

  .card__title {
    font-size: clamp(1.15rem, 1rem + 0.8vw, 1.75rem);
    overflow-wrap: anywhere;
  }

  .card__meta,
  .card__status {
    color: var(--muted);
  }

  .card__summary {
    max-width: 52ch;
  }

  .card__links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.25rem;
    font-weight: 700;
  }
</style>
```

- [ ] **Step 4: Write the work index**

`src/pages/work/index.astro`:

```astro
---
import { Image } from 'astro:assets';
import Base from '../../layouts/Base.astro';
import ProjectCard from '../../components/ProjectCard.astro';
import { asset } from '../../lib/assets';
import { getCardsByGroup, getFlagship } from '../../lib/content';

const [flagship, groups] = await Promise.all([getFlagship(), getCardsByGroup()]);
---
<Base
  title="Work"
  description="Everything Jason Pereira has built: AI products, full-stack apps, quant projects, hackathon wins and a rocket motor."
>
  <section class="index section theme-paper">
    <p class="index__label label">Work</p>
    <h1 class="index__title display">Everything I've built.</h1>

    <ul class="index__flagship">
      {flagship.map((project, index) => (
        <li>
          <a class="feature" href={`/work/${project.id}`}>
            <div class="feature__media">
              <Image
                src={asset(`work/${project.data.cover}`)}
                alt=""
                widths={[480, 720, 960, 1280]}
                sizes="(max-width: 800px) 92vw, 46vw"
                loading={index < 2 ? 'eager' : 'lazy'}
              />
            </div>
            <h2 class="feature__title display">{project.data.title}</h2>
            <p class="feature__tagline">{project.data.tagline}</p>
            <p class="feature__meta label">{project.data.dates}</p>
          </a>
        </li>
      ))}
    </ul>

    {groups.map((group) => (
      <section class="index__group" aria-labelledby={`group-${group.group}`}>
        <h2 class="index__group-title label" id={`group-${group.group}`}>{group.label}</h2>
        <div class="index__cards">
          {group.projects.map((project) => <ProjectCard project={project} />)}
        </div>
      </section>
    ))}
  </section>
</Base>

<style>
  .index {
    padding-top: calc(var(--nav-height) + clamp(2.5rem, 6vw, 6rem));
  }

  .index__label {
    margin-bottom: 1rem;
    color: var(--muted);
  }

  .index__title {
    margin-bottom: clamp(2.5rem, 6vw, 5rem);
    font-size: clamp(1.9rem, 0.5rem + 7.4vw, 8rem);
    overflow-wrap: anywhere;
  }

  .index__flagship {
    display: grid;
    gap: clamp(1.5rem, 3vw, 2.5rem);
  }

  .feature {
    display: grid;
    gap: 0.5rem;
    text-decoration: none;
  }

  .feature__media {
    overflow: hidden;
    aspect-ratio: 16 / 10;
    margin-bottom: 0.5rem;
    border-radius: var(--radius);
    background: var(--line);
  }

  .feature__media :global(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.6s var(--ease);
  }

  .feature:hover .feature__media :global(img) {
    transform: scale(1.03);
  }

  .feature__title {
    font-size: clamp(1.5rem, 1.1rem + 1.8vw, 2.75rem);
    overflow-wrap: anywhere;
  }

  .feature__tagline,
  .feature__meta {
    color: var(--muted);
  }

  .index__group {
    margin-top: var(--section-gap);
  }

  .index__group-title {
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
  }

  @media (min-width: 800px) {
    .index__flagship,
    .index__cards {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: clamp(1.5rem, 3vw, 2.5rem);
    }
  }
</style>
```

- [ ] **Step 5: Write the case-study page**

`src/pages/work/[slug].astro`:

```astro
---
import type { InferGetStaticPropsType } from 'astro';
import { Image } from 'astro:assets';
import { render } from 'astro:content';
import Base from '../../layouts/Base.astro';
import { asset, assetsIn } from '../../lib/assets';
import { getFlagship } from '../../lib/content';

export async function getStaticPaths() {
  const flagship = await getFlagship();
  return flagship.map((project, index) => ({
    params: { slug: project.id },
    props: { project, next: flagship[(index + 1) % flagship.length] },
  }));
}

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

const { project, next } = Astro.props;
const { data } = project;
const { Content } = await render(project);
const cover = asset(`work/${data.cover}`);
const gallery = assetsIn(`work/${project.id}`);
---
<Base title={data.title} description={data.summary}>
  <article class="case section theme-paper">
    <p class="case__crumb label"><a href="/work">Work</a> / {data.tagline}</p>
    <h1 class="case__title display">{data.title}</h1>
    <p class="case__summary">{data.summary}</p>

    <div class="case__cover">
      <Image
        src={cover}
        alt={`${data.title} screenshot`}
        widths={[640, 960, 1280, 1600]}
        sizes="(max-width: 1100px) 94vw, 1400px"
        priority
      />
    </div>

    <dl class="case__credits">
      <div>
        <dt class="label">Role</dt>
        <dd>{data.role}</dd>
      </div>
      <div>
        <dt class="label">Year</dt>
        <dd>{data.dates}</dd>
      </div>
      <div>
        <dt class="label">Status</dt>
        <dd>{data.status}</dd>
      </div>
      <div>
        <dt class="label">Stack</dt>
        <dd>{data.stack.join(', ')}</dd>
      </div>
      <div>
        <dt class="label">Links</dt>
        <dd class="case__links">
          {data.links.map((link) => (
            <a href={link.href} target="_blank" rel="noopener">{link.label}</a>
          ))}
        </dd>
      </div>
    </dl>

    <div class="case__blocks">
      <section>
        <h2 class="label">Problem</h2>
        <p>{data.problem}</p>
      </section>
      <section>
        <h2 class="label">What I built</h2>
        <Content />
      </section>
      <section>
        <h2 class="label">Result</h2>
        <p>{data.result}</p>
      </section>
    </div>

    {gallery.length > 0 && (
      <ul class="case__gallery">
        {gallery.map((image) => (
          <li>
            <Image src={image} alt="" widths={[640, 960, 1280]} sizes="(max-width: 800px) 92vw, 46vw" loading="lazy" />
          </li>
        ))}
      </ul>
    )}

    <a class="case__next" href={`/work/${next.id}`}>
      <span class="label">Next</span>
      <span class="case__next-title display">{next.data.title}</span>
    </a>
  </article>
</Base>

<style>
  .case {
    padding-top: calc(var(--nav-height) + clamp(2.5rem, 6vw, 6rem));
  }

  .case__crumb {
    margin-bottom: 1rem;
    color: var(--muted);
  }

  .case__title {
    font-size: clamp(2.2rem, 0.8rem + 7.4vw, 8.5rem);
    overflow-wrap: anywhere;
  }

  .case__summary {
    max-width: 46ch;
    margin-top: 1.25rem;
    font-size: clamp(1.1rem, 1rem + 0.6vw, 1.6rem);
  }

  .case__cover {
    overflow: hidden;
    margin-top: clamp(2rem, 5vw, 4rem);
    border-radius: var(--radius);
    background: var(--line);
  }

  .case__cover :global(img) {
    width: 100%;
    height: auto;
  }

  .case__credits {
    margin-top: clamp(2rem, 5vw, 4rem);
    border-bottom: 1px solid var(--line);
  }

  .case__credits > div {
    display: grid;
    grid-template-columns: minmax(5rem, 1fr) minmax(0, 4fr);
    gap: 1rem;
    padding-block: 0.9rem;
    border-top: 1px solid var(--line);
  }

  .case__credits dt {
    padding-top: 0.25em;
    color: var(--muted);
  }

  .case__links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.25rem;
    font-weight: 700;
  }

  .case__blocks {
    display: grid;
    gap: clamp(2rem, 4vw, 3.5rem);
    margin-top: var(--section-gap);
  }

  @media (min-width: 900px) {
    .case__blocks {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .case__blocks h2 {
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--line);
    color: var(--muted);
  }

  /* :global because the "What I built" paragraphs are rendered from Markdown, outside this component's scope. */
  .case__blocks :global(p) {
    font-size: clamp(1rem, 0.95rem + 0.3vw, 1.2rem);
  }

  .case__blocks :global(p + p) {
    margin-top: 1em;
  }

  .case__gallery {
    display: grid;
    gap: clamp(1rem, 2.5vw, 2rem);
    margin-top: var(--section-gap);
  }

  @media (min-width: 800px) {
    .case__gallery {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .case__gallery :global(img) {
    width: 100%;
    height: auto;
    border-radius: calc(var(--radius) / 2);
  }

  .case__next {
    display: grid;
    gap: 0.5rem;
    margin-top: var(--section-gap);
    padding-top: 1.5rem;
    border-top: 1px solid var(--line);
    text-decoration: none;
  }

  .case__next .label {
    color: var(--muted);
  }

  .case__next-title {
    font-size: clamp(1.8rem, 1rem + 4.4vw, 5.5rem);
    overflow-wrap: anywhere;
    transition: color 0.25s var(--ease);
  }

  .case__next:hover .case__next-title {
    color: var(--accent);
  }
</style>
```

- [ ] **Step 6: Run all checks and commit**

Run: `npm run verify`
Expected: all green; the build lists `/work/index.html` and four `/work/<slug>/index.html` pages; Playwright 28 passed.

```bash
git add src/components/ProjectCard.astro src/pages/work tests/e2e/work-pages.spec.ts
git commit -m "feat: add work index and four case-study pages" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Resume page and 404 page

**Files:**
- Create: `src/pages/resume.astro`, `src/pages/404.astro`
- Test: `tests/e2e/pages.spec.ts`

**Interfaces:**
- Consumes: `getSite()`, `getResume()`, `getExperience()`, `getEducation()`, `getFlagship()`; `resumePdfUrl`; `Base.astro`; `Button.astro`.
- Produces: the routes `/resume` and `/404` (served for any unknown address).

- [ ] **Step 1: Write the failing end-to-end test**

`tests/e2e/pages.spec.ts`:

```ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

test('the resume page shows every section from the content spec', async ({ page }) => {
  await page.goto('/resume');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Jason Pereira');
  const sections = ['Education', 'Experience', 'Projects', 'Skills', 'Certifications', 'Awards and recognition', 'Publication'];
  for (const heading of sections) {
    await expect(page.locator('.resume').getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await expect(page.getByText('AWS Certified Solutions Architect – Associate')).toBeVisible();
  await expect(page.getByText('Selected for Y Combinator Startup School 2026 (San Francisco, Jul 25–26)')).toBeVisible();
  await expect(page.getByRole('link', { name: /doi\.org/ })).toHaveAttribute(
    'href',
    'https://doi.org/10.63966/teem.v17i1.2265',
  );
});

test('the PDF download is offered only when the file exists', async ({ page }) => {
  await page.goto('/resume');
  const hasPdf = existsSync(join(process.cwd(), 'public', 'jason-pereira-resume.pdf'));
  await expect(page.getByRole('link', { name: 'Download PDF' })).toHaveCount(hasPdf ? 1 : 0);
});

test('unknown addresses get the 404 page with a way home', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('404');
  await expect(page.locator('main').getByRole('link', { name: 'Back home' })).toHaveAttribute('href', '/');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run build && npx playwright test pages.spec`
Expected: FAIL, `/resume` has no `.resume` and there is no 404 page with a heading.

- [ ] **Step 3: Write the resume page**

`src/pages/resume.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import Button from '../components/Button.astro';
import { getEducation, getExperience, getFlagship, getResume, getSite } from '../lib/content';
import { resumePdfUrl } from '../lib/resume-pdf';

const [site, resume, roles, schools, flagship] = await Promise.all([
  getSite(),
  getResume(),
  getExperience(),
  getEducation(),
  getFlagship(),
]);
const doiLabel = resume.publication.url.replace(/^https?:\/\//, '');
---
<Base title="Resume" description={`Resume of ${site.name}: experience, education, projects, skills and awards.`}>
  <article class="resume section theme-paper">
    <header class="resume__head">
      <p class="label">Resume, {new Date().getFullYear()}</p>
      <h1 class="resume__name display">{site.name}</h1>
      <p class="resume__pitch">{site.pitch.join(' ')}</p>
      <div class="resume__actions">
        {resumePdfUrl && <Button href={resumePdfUrl} variant="solid">Download PDF</Button>}
        <Button href={`mailto:${site.email}`}>Email</Button>
        <Button href={site.links.linkedin} external>LinkedIn</Button>
        <Button href={site.links.github} external>GitHub</Button>
      </div>
    </header>

    <section class="resume__block">
      <h2 class="label">Education</h2>
      <ul>
        {schools.map((item) => (
          <li class="resume__row">
            <h3>{item.data.school}</h3>
            <p>{item.data.detail}</p>
            <p class="label">{item.data.dates}</p>
          </li>
        ))}
      </ul>
    </section>

    <section class="resume__block">
      <h2 class="label">Experience</h2>
      <ul>
        {roles.map((item) => (
          <li class="resume__row">
            <h3>{item.data.org}</h3>
            <p class="resume__role">{item.data.role}</p>
            <p class="label">{[item.data.place, item.data.dates].filter(Boolean).join(' · ')}</p>
            <p>{item.data.summary}</p>
          </li>
        ))}
      </ul>
    </section>

    <section class="resume__block">
      <h2 class="label">Projects</h2>
      <ul>
        {flagship.map((project) => (
          <li class="resume__row">
            <h3><a href={`/work/${project.id}`}>{project.data.title}</a></h3>
            <p class="label">{project.data.dates}</p>
            <p>{project.data.summary}</p>
          </li>
        ))}
      </ul>
    </section>

    <section class="resume__block">
      <h2 class="label">Skills</h2>
      <dl>
        {resume.skills.map((group) => (
          <div class="resume__row resume__row--split">
            <dt class="label">{group.label}</dt>
            <dd>{group.items}</dd>
          </div>
        ))}
      </dl>
    </section>

    <section class="resume__block">
      <h2 class="label">Certifications</h2>
      <ul>
        {resume.certifications.map((item) => <li class="resume__row">{item}</li>)}
      </ul>
    </section>

    <section class="resume__block">
      <h2 class="label">Awards and recognition</h2>
      <ul>
        {resume.awards.map((item) => <li class="resume__row">{item}</li>)}
      </ul>
    </section>

    <section class="resume__block">
      <h2 class="label">Publication</h2>
      <div class="resume__row">
        <p>{resume.publication.citation}</p>
        <p><a href={resume.publication.url} target="_blank" rel="noopener">{doiLabel}</a></p>
      </div>
    </section>
  </article>
</Base>

<style>
  .resume {
    padding-top: calc(var(--nav-height) + clamp(2.5rem, 6vw, 6rem));
  }

  .resume__head {
    display: grid;
    justify-items: start;
    gap: 1rem;
  }

  .resume__head .label {
    color: var(--muted);
  }

  .resume__name {
    font-size: clamp(2.6rem, 1rem + 8vw, 9rem);
  }

  .resume__pitch {
    max-width: 40ch;
    font-size: clamp(1rem, 0.9rem + 0.5vw, 1.35rem);
    font-weight: 800;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .resume__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 0.5rem;
  }

  .resume__block {
    display: grid;
    gap: 0 2rem;
    margin-top: clamp(2.5rem, 6vw, 5rem);
    border-bottom: 1px solid var(--line);
  }

  .resume__block > h2 {
    padding-block: 1rem;
    border-top: 1px solid var(--line);
    color: var(--muted);
  }

  @media (min-width: 900px) {
    .resume__block {
      grid-template-columns: minmax(0, 1fr) minmax(0, 4fr);
    }
  }

  .resume__row {
    display: grid;
    gap: 0.3rem;
    max-width: 78ch;
    padding-block: 1rem;
    border-top: 1px solid var(--line);
  }

  .resume__row h3 {
    font-size: 1.05rem;
    font-weight: 900;
    font-stretch: 125%;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .resume__row .label {
    color: var(--muted);
  }

  .resume__role {
    font-weight: 700;
  }

  @media (min-width: 600px) {
    .resume__row--split {
      grid-template-columns: 11rem minmax(0, 1fr);
      gap: 1rem;
    }
  }

  .resume__row--split dt {
    padding-top: 0.3em;
  }
</style>
```

- [ ] **Step 4: Write the 404 page**

`src/pages/404.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import Button from '../components/Button.astro';
---
<Base title="Page not found" description="This page does not exist.">
  <section class="lost section theme-paper">
    <div class="lost__wash" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <h1 class="lost__code display">404</h1>
    <p class="lost__text">This page isn't here.</p>
    <Button href="/" variant="solid">Back home</Button>
  </section>
</Base>

<style>
  .lost {
    display: grid;
    align-content: center;
    justify-items: start;
    gap: 1.25rem;
    min-height: 82svh;
  }

  .lost__code {
    font-size: clamp(6rem, 2rem + 26vw, 24rem);
  }

  .lost__text {
    font-size: clamp(1.1rem, 1rem + 0.6vw, 1.6rem);
  }

  /* A still paint wash behind the numerals: three uneven blobs. */
  .lost__wash {
    position: absolute;
    inset: 0;
    z-index: -1;
    overflow: hidden;
  }

  .lost__wash span {
    position: absolute;
    background: var(--orange);
  }

  .lost__wash span:nth-child(1) {
    top: 12%;
    left: 30%;
    width: 44vw;
    height: 34vw;
    border-radius: 58% 42% 55% 45% / 48% 60% 40% 52%;
    opacity: 0.8;
  }

  .lost__wash span:nth-child(2) {
    top: 36%;
    left: 54%;
    width: 30vw;
    height: 26vw;
    border-radius: 42% 58% 38% 62% / 55% 45% 55% 45%;
    opacity: 0.5;
  }

  .lost__wash span:nth-child(3) {
    top: 62%;
    left: 22%;
    width: 9vw;
    height: 8vw;
    border-radius: 50% 50% 46% 54% / 52% 48% 52% 48%;
    background: var(--ink);
    opacity: 0.9;
  }
</style>
```

- [ ] **Step 5: Run all checks and commit**

Run: `npm run verify`
Expected: all green; Playwright 31 passed.

```bash
git add src/pages/resume.astro src/pages/404.astro tests/e2e/pages.spec.ts
git commit -m "feat: add resume page and 404 page" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Smooth scrolling, resilience checks and the performance budget

This task adds the last script (smooth scrolling) and then proves the design spec's non-visual requirements: readable without JavaScript, no sideways scrolling at any width, every internal link resolves, reduced motion respected, and the page-weight budget met.

**Files:**
- Create: `src/scripts/smooth.ts`
- Modify: `src/scripts/main.ts`
- Test: `tests/e2e/resilience.spec.ts`, `tests/e2e/budget.spec.ts`

**Interfaces:**
- Consumes: everything built so far.
- Produces: `startSmoothScroll(): Lenis` in `src/scripts/smooth.ts`. Lenis adds the class `lenis` to `<html>` while active.

- [ ] **Step 1: Write the resilience tests**

`tests/e2e/resilience.spec.ts`:

```ts
import { expect, test } from '@playwright/test';

const pages = ['/', '/work', '/work/case-closed', '/resume', '/404'];

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the home page content is all readable', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Jason Pereira' })).toBeVisible();
    await expect(page.getByText('I build AI systems that')).toBeVisible();
    for (const title of ['Case Closed', 'Orbit', 'StreetLab', 'GPU Portfolio & Risk Decision Engine']) {
      await expect(page.locator('#work').getByRole('heading', { name: title })).toBeVisible();
    }
    await expect(page.locator('#work [role="tablist"]')).toBeHidden();
    await expect(page.locator('.numbers__numeral').first()).toHaveText('220+');
    await expect(page.getByRole('link', { name: 'jasonpereira518@gmail.com' })).toBeVisible();
  });
});

test.describe('layout', () => {
  for (const width of [320, 375, 768, 1440]) {
    test(`no page scrolls sideways at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of pages) {
        await page.goto(path);
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} is ${overflow}px wider than the viewport`).toBeLessThanOrEqual(0);
      }
    });
  }
});

test.describe('smooth scrolling', () => {
  test('starts for mouse users', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\blenis\b/);
  });

  test('stays off under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/\bjs\b/);
    await page.waitForTimeout(500);
    await expect(page.locator('html')).not.toHaveClass(/\blenis\b/);
  });
});

test('the first Tab stop is the skip link', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
});

test('every internal link on every page resolves', async ({ page, request }) => {
  const targets = new Set<string>();
  for (const path of pages.filter((candidate) => candidate !== '/404')) {
    await page.goto(path);
    const hrefs = await page
      .locator('a[href^="/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
    for (const href of hrefs) targets.add(href.split('#')[0] || '/');
  }
  expect(targets.size).toBeGreaterThan(5);
  for (const target of targets) {
    const response = await request.get(target);
    expect(response.status(), `${target} returned ${response.status()}`).toBe(200);
  }
});
```

`tests/e2e/budget.spec.ts`:

```ts
import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

const KB = 1024;

test('the home page first load stays within the budget', async ({ page }) => {
  const sizes = { js: 0, total: 0 };
  const pending: Promise<void>[] = [];

  page.on('response', (response) => {
    pending.push(
      (async () => {
        if (!response.ok()) return;
        let body: Buffer;
        try {
          body = await response.body();
        } catch {
          return; // redirects and aborted requests have no body, so they add no bytes
        }
        const type = response.headers()['content-type'] ?? '';
        // The preview server does not compress; production does. Count text as it would be sent.
        const bytes = /javascript|css|html|svg|json/.test(type) ? gzipSync(body).length : body.length;
        sizes.total += bytes;
        if (type.includes('javascript')) sizes.js += bytes;
      })(),
    );
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await Promise.all(pending);

  const report = `JavaScript ${Math.round(sizes.js / KB)} KB, total ${Math.round(sizes.total / KB)} KB`;
  expect(sizes.js, report).toBeLessThanOrEqual(50 * KB);
  expect(sizes.total, report).toBeLessThanOrEqual(600 * KB);
});
```

- [ ] **Step 2: Run them to see what fails**

Run: `npm run build && npx playwright test resilience budget`
Expected: the "starts for mouse users" test FAILS (smooth scrolling is not wired up yet). The others should pass; if one does not, fix it in Step 4 before continuing.

- [ ] **Step 3: Add smooth scrolling**

`src/scripts/smooth.ts`:

```ts
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/** Smooth wheel scrolling for mouse and trackpad users. In-page anchor links scroll smoothly too. */
export function startSmoothScroll(): Lenis {
  return new Lenis({ autoRaf: true, anchors: true });
}
```

Append to the end of `src/scripts/main.ts`:

```ts
// Smooth scrolling for mouse and trackpad users, loaded once the browser is idle.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(pointer: fine)').matches) {
  const start = () => {
    import('./smooth')
      .then((module) => module.startSmoothScroll())
      .catch((error: unknown) => console.error('Smooth scrolling failed to start', error));
  };
  if ('requestIdleCallback' in window) requestIdleCallback(start);
  else setTimeout(start, 1);
}
```

- [ ] **Step 4: Run everything, and fix whatever the new tests expose**

Run: `npm run verify`
Expected: all green; Playwright 41 passed.

If a check fails, these are the usual causes:

| Failing test | Likely cause and fix |
|---|---|
| `no page scrolls sideways at 320px` | An element is wider than the viewport. Find it by running this in the browser console at that width: `[...document.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map((el) => el.className)`. Fix it in that component's styles (usually a display font size whose `clamp()` minimum is too large, or a missing `minmax(0, 1fr)`). |
| `the home page content is all readable` (no JavaScript) | Something is hidden by a rule that does not depend on the `js` class. Hiding rules must sit under `:global(.js)` or `.js`. |
| `the home page first load stays within the budget` | The message prints both figures. For images, lower the largest value in that image's `widths` or add `quality="mid"`. For JavaScript, check that island modules are still imported dynamically in `main.ts`. |

- [ ] **Step 5: Measure with Lighthouse**

```bash
npm run build
npm run preview &
PREVIEW_PID=$!
sleep 3
CHROME_PATH="$(node -e "import('@playwright/test').then(({ chromium }) => console.log(chromium.executablePath()))")" \
  npx lighthouse@latest http://localhost:4321/ --only-categories=performance --output=json --output-path=lighthouse.json --quiet --chrome-flags="--headless=new"
kill $PREVIEW_PID
node -e "const r = JSON.parse(require('node:fs').readFileSync('lighthouse.json', 'utf8')); console.log('performance', Math.round(r.categories.performance.score * 100), '| LCP', r.audits['largest-contentful-paint'].displayValue, '| CLS', r.audits['cumulative-layout-shift'].displayValue);"
```

Expected: `performance` 95 or higher, LCP under 2.0 s, CLS under 0.05. (Lighthouse emulates a mid-range phone on a slow connection by default.) The local preview server sends files uncompressed, so this run is slightly pessimistic; it is repeated against the real host in Task 16. If the score is low, open `lighthouse.json` in the Lighthouse viewer and fix the top opportunity. The usual one here is the portrait: confirm it is served as AVIF at a width close to its displayed size.

- [ ] **Step 6: Look at every page at desktop and phone widths**

Run: `npm run dev`. At 1440px and 375px wide, check `/`, `/work`, `/work/case-closed`, `/resume` and an unknown address:

- Sections alternate paper and ink; the nav stays readable over both.
- Hero: wordmark spans the width; paint follows the pointer over the portrait.
- Statement words light up; the marquee runs.
- Tabs switch projects; numerals count up; experience rows and about facts fade in.
- The footer email spans its panel.
- With the operating system's "reduce motion" setting on: no marquee, no paint, no count-up, no smooth scroll, and nothing is missing.

- [ ] **Step 7: Commit**

```bash
git add src/scripts/smooth.ts src/scripts/main.ts tests/e2e/resilience.spec.ts tests/e2e/budget.spec.ts
git commit -m "feat: add smooth scrolling and resilience, link and budget checks" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Include in the same commit any component fixes made in Step 4.

---

### Task 15: Real images, captions and the external link check

**This task needs files and answers from Jason. Do not invent captions, and do not download anything from his repositories without asking him first.**

**Files:**
- Create: `scripts/check-links.mjs`
- Modify: `package.json` (one script), `src/content/about.yaml` (captions), and any project file whose link turns out to be private
- Replace: the images in `src/assets/`; add `public/jason-pereira-resume.pdf`

**Interfaces:**
- Consumes: the placeholder manifest and guard from Task 4.
- Produces: npm script `check:links`; a site with no placeholder images.

- [ ] **Step 1: Collect the files from Jason**

Ask Jason to save these at exactly these paths (same file names and extensions):

| File | Path | Notes |
|---|---|---|
| Portrait | `src/assets/portrait.png` | Transparent background, head and shoulders, at least 1200px wide |
| Collage photos | `src/assets/collage/01.jpg` … `06.jpg` | Any orientation; at least 1000px on the long side |
| StreetLab cover | `src/assets/work/streetlab.png` | A screenshot from his StreetLab repository |
| GPU engine cover | `src/assets/work/gpu-portfolio-engine.png` | A benchmark chart or terminal output from his results |
| Resume PDF | `public/jason-pereira-resume.pdf` | The version he wants public |

Also ask for a caption (place and year) for each collage photo.

- [ ] **Step 2: Capture the two live products**

These are Jason's own public sites:

```bash
npx playwright screenshot --viewport-size=1600,1000 --wait-for-timeout=3000 https://caseclosed.jasonpereira.live src/assets/work/case-closed.png
npx playwright screenshot --viewport-size=1600,1000 --wait-for-timeout=3000 https://orbit.jasonpereira.live src/assets/work/orbit.png
```

Expected: each command writes a 1600×1000 PNG. Open both and confirm they show the product, not a login wall or cookie banner. If one does, ask Jason for a screenshot instead.

- [ ] **Step 3: Add the captions**

In `src/content/about.yaml`, add a `caption` under each collage entry, using Jason's wording. The format is:

```yaml
  collage:
    - file: 01.jpg
      caption: TEDxUNC, 2026
```

(The caption shown is an example of the format; use the captions Jason gives for his actual photos.)

- [ ] **Step 4: Confirm no placeholders remain**

Run: `npm run placeholders && npm run check:assets`
Expected: `0 placeholder(s) recorded`, then `No placeholder images remain.` with no note about a missing resume PDF.

- [ ] **Step 5: Write the external link check**

`scripts/check-links.mjs`:

```js
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
```

In `package.json`, add to `"scripts"`:

```json
    "check:links": "node scripts/check-links.mjs",
```

- [ ] **Step 6: Run the link check and resolve failures with Jason**

Run: `npm run build && npm run check:links`
Expected: every link `ok` or `skipped`. For each failure, ask Jason whether to remove that link (private repository) or correct it, then edit the `links` list in the matching `src/content/projects/*.md` file and rerun. Open the two skipped links (LinkedIn, Google Scholar) by hand once.

- [ ] **Step 7: Re-verify with the real images**

Run: `npm run verify`
Expected: all green, including the budget test with real image weights. If the budget fails, apply the image fix from the Task 14 table. Repeat the Lighthouse run from Task 14 Step 5 and confirm it still meets the targets.

- [ ] **Step 8: Look at the hero with the real portrait**

Run: `npm run dev`. Confirm the wordmark reads clearly across the portrait, the paint looks right over the face, and the portrait's bottom edge sits flush with the hero's bottom edge. Adjust `width` and `max-height` of `.hero__figure` in `Hero.astro` if the framing is off.

- [ ] **Step 9: Commit**

```bash
git add src/assets public/jason-pereira-resume.pdf src/content scripts/check-links.mjs package.json
git commit -m "feat: replace placeholders with real images and add external link check" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 16: Deploy to Vercel

**Every deploy step needs Jason's explicit go-ahead in chat. Publishing the site and moving the `jasonpereira.live` domain off the current site are his decisions.**

**Files:**
- Create: `vercel.json`

**Interfaces:**
- Consumes: the finished, verified site.
- Produces: a Vercel preview URL, then (on Jason's confirmation) the production deployment.

- [ ] **Step 1: Add long-lived caching for hashed assets**

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/_astro/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

Everything under `/_astro/` has a content hash in its file name, so it can be cached for a year.

- [ ] **Step 2: Run the full pre-deploy checks**

```bash
npm run verify && npm run check:assets && npm run check:links
```

Expected: all three succeed. Do not deploy while `check:assets` reports placeholders.

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore: add Vercel cache headers for hashed assets" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 4: Ask Jason, then deploy a preview**

Ask: "Ready to deploy a private preview to Vercel? This creates a new Vercel project named `jason-pereira-portfolio`." Wait for yes.

Jason signs in himself (it opens a browser):

```bash
npx vercel@latest login
```

Then:

```bash
npx vercel@latest link --yes --project jason-pereira-portfolio
npx vercel@latest deploy
```

Expected: `deploy` prints a preview URL ending in `.vercel.app`. Vercel detects Astro, runs `astro build` and serves `dist/`.

- [ ] **Step 5: Check the preview**

Open the preview URL in the browser pane. Check `/`, `/work`, one case study, `/resume` and an unknown address; move the pointer over the portrait; confirm the browser console shows no errors. Then run Lighthouse against it (replace the URL):

```bash
CHROME_PATH="$(node -e "import('@playwright/test').then(({ chromium }) => console.log(chromium.executablePath()))")" \
  npx lighthouse@latest https://PREVIEW-URL.vercel.app/ --only-categories=performance --output=json --output-path=lighthouse.json --quiet --chrome-flags="--headless=new"
node -e "const r = JSON.parse(require('node:fs').readFileSync('lighthouse.json', 'utf8')); console.log('performance', Math.round(r.categories.performance.score * 100), '| LCP', r.audits['largest-contentful-paint'].displayValue, '| CLS', r.audits['cumulative-layout-shift'].displayValue);"
```

Expected: performance 95 or higher, LCP under 2.0 s, CLS under 0.05. Share the preview URL and the three figures with Jason.

- [ ] **Step 6: Ask Jason, then go to production**

Ask two separate questions and wait for each answer:

1. "Deploy this to production on Vercel?" On yes: `npx vercel@latest deploy --prod`.
2. "Point `jasonpereira.live` at the new site? That replaces the current site at that address." Only on yes, Jason adds the domain to the project in the Vercel dashboard (Project → Settings → Domains), since it involves his DNS and the project the domain is attached to now.

- [ ] **Step 7: Merge the branch**

After Jason confirms the production site looks right:

```bash
git switch main
git merge --ff-only site-v1
```

---

## Not in this plan

- **Self-drawing signature** beside the marquee. Needs Jason's signature as an SVG path; add it once he supplies one.
- **Social share image** (Open Graph image). The pages carry title and description tags only.
- **Analytics, sitemap, a GitHub remote and CI.** Not in the design spec; add on request.
- **Jason's three open content decisions** (naming teammates, an Intelitrade link, a Leet Streak repo link) keep their defaults from the content spec until he says otherwise.
