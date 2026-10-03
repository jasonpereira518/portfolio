# Jason Pereira — Portfolio: Design Spec

## Context

Jason wants a portfolio site modeled on cooperdelo.com and landonorris.com: very creative, design and visual heavy, but fast to load. Revised on Jason's instruction: **no computer-science concepts as visual motifs** (no data structures, algorithms, code or terminal styling). The hero borrows Lando's fluid cursor interaction, but instead of revealing a helmet it lays paint washes over the face. The project folder (`/Users/jasonpereira/Jason/Projects/Portfolio`) is empty and not yet a git repo.

Order of work: (1) design spec — this document, (2) content analysis, (3) implementation plan, (4) build. No code is written until steps 2 and 3 are done.

## Decisions made with Jason

| Topic | Decision |
|---|---|
| Lead style | Hybrid: Cooper's structure, typography and static speed + a few Lando-grade interactive moments |
| Audience | Recruiters and engineers. Skimmable in 30 seconds |
| Assets | Portrait photo and project screenshots available. No video |
| Hero | Lando-style fluid cursor interaction: hovering the face lays paint washes over it (no helmet) |
| Palette | Paper, ink, signal orange |
| Stack | Astro + TypeScript, deployed to Vercel as a static site |
| Removed | The "Under the hood" Render/Source concept and every CS-themed visual |

## What was learned from the references

- **cooperdelo.com** — static HTML + vanilla JS + Lenis; huge wide display type; cream/black alternating sections; giant wordmark hero; tabbed "Selected Work" showcase; numbered about facts; case studies with a credits table; designed resume page; giant email footer.
- **landonorris.com** — cursor-mask portrait-to-helmet hero; animated contour-line background; serif mixed with grotesk in one headline; marquee with a self-drawing signature; giant stat numerals; scattered photo collage; fan-out cards; rounded footer panel.

## Visual system

- **Colour**: paper `#ECE7DC`, ink `#121210`, accent orange `#FF5A26` on ink and `#F0440F` on paper. Orange for large type, lines and fills only. Sections alternate paper and ink.
- **Type** (two self-hosted, subset woff2 files): Archivo variable (expanded black for display and wordmark, regular for body and small uppercase labels) and Instrument Serif for accent words inside headlines.
- **Background**: slow-drifting contour lines, as on Lando's site.
- **Nav**: name left; live local time + location centre; Work / About / Resume / Contact right.
- **Motion**: Lenis smooth scroll on desktop; scroll reveals; subtle parallax; everything static under `prefers-reduced-motion`.

## Home page sections

| # | Section | Design | Borrowed from |
|---|---|---|---|
| 1 | Hero | Cut-out portrait centred with giant `JASON PEREIRA` wordmark at the bottom, one-line pitch, buttons: See the work / Resume. Moving the cursor over the face lays fluid paint washes over it that trail the cursor and fade. Touch: drag to paint, with a slow auto-drift | Lando hero, Cooper wordmark |
| 2 | Statement | Large serif-and-grotesk paragraph with orange accent words, resolving word by word on scroll; marquee line with a signature that draws itself | Lando |
| 3 | Selected work | Tabbed showcase with a sticky screenshot stage; each tab links to its case study | Cooper |
| 4 | Numbers | Giant numerals that scale and count up on scroll | Lando "49 podiums" |
| 5 | Experience | Clean dated rows (role, place, dates, one line) | Cooper resume |
| 6 | About | Short bio, numbered facts, scattered parallax photo collage with captions | Both |
| 7 | Contact | Giant email on ink inside a rounded panel; buttons for email / LinkedIn / GitHub / resume | Both |

## Other pages

- **`/work`** — card grid of all projects.
- **`/work/[slug]`** — case study: giant title, credits table (Role / Year / Stack / Link), hero screenshot, three short blocks (Problem / What I built / Result), screenshot gallery, "next project" link.
- **`/resume`** — designed HTML resume + PDF download.
- **`404`** — simple designed page with a paint wash and a link home.

## Hero reveal: how it works

- Jason's choice: no helmet. Instead, moving the cursor over the face lays **paint washes** over the portrait.
- A 2D canvas sits over the portrait; the cursor leaves soft, fluid, blob-edged washes of colour (signal orange, with ink and paper tones) that trail with easing, blend with the photo, and slowly fade so the face returns.
- Same fluid feel as Lando's mask, but only one image is needed.
- No WebGL; loads after the portrait so the first paint is just the photo.

## Architecture (for the implementation plan)

- Astro static output; one component per section in `src/components/sections/`; shared `Nav`, `ContourBg`.
- Content in `src/content/` (Markdown per project, YAML for experience / numbers / site details).
- Design tokens in `src/styles/tokens.css`.
- Interactive pieces are small vanilla TS modules (`hero-reveal`, `contour`, `showcase`, `numbers`, `collage`) loaded only when their section nears the viewport and paused off-screen.
- No React, no WebGL, no three.js, no GSAP.

## Performance and accessibility requirements

- Home page first load ≤ 600 KB transferred; JS ≤ 50 KB compressed.
- Lighthouse mobile performance ≥ 95; LCP < 2.0 s; CLS < 0.05.
- All content readable with JavaScript disabled; canvases are decorative and `aria-hidden`.
- Full keyboard access, visible focus; `prefers-reduced-motion` gives static frames.
- Images as AVIF/WebP at responsive sizes.

## Out of scope for version 1

Blog, CMS, contact form backend, analytics, dark mode, video, command palette.

## Open items for the content phase

- Portrait cut-out (transparent background).
- Project list, order, screenshots, stacks.
- Numbers to show; experience and education entries; bio, facts, photos, location, links, resume PDF.
- One-line pitch and statement paragraph.

## Next steps after approval

1. `git init`; save this spec to `docs/superpowers/specs/2026-10-03-portfolio-design.md`; commit.
2. Content analysis with Jason.
3. Write the implementation plan (superpowers:writing-plans), then build.

## Verification (once built)

- `astro check` and `astro build` pass.
- In the browser pane: screenshot every section at desktop and mobile widths; exercise the hero reveal and showcase tabs.
- Lighthouse mobile run meets the budget; islands load lazily.
- Re-test with JavaScript disabled and with reduced motion enabled.
