# Jason Pereira — portfolio

Static site built with Astro. Design and content specs are in `docs/superpowers/specs/`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server at http://localhost:4321 |
| `npm run verify` | Type check, unit tests, build, end-to-end tests |
| `npm run placeholders` | Create placeholder images for any that are missing |
| `npm run check:assets` | Fail if any placeholder image is still in use |
| `npm run check:links` | Request every external link in the built site and list the ones that do not load (run after `npm run build`) |
| `npm run share-image` | Render the link-preview card to `public/og.jpg` (run after `npm run build`, and again whenever the portrait, name, first pitch line or availability changes) |

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

Then run `npm run placeholders` (it stops tracking replaced files) and `npm run check:assets`.
