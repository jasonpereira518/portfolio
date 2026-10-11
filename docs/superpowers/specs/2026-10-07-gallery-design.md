# Gallery design

## Purpose
A `/gallery` page of Jason's professional and achievement photos, also linked from the Achievements page. Photo
captions follow the recruiting spec: dates that aren't on record are left out rather than guessed.

## Page
- Header: the label "See a few of my accolades" over a compact "GALLERY" title.
- The wall: two photos tall, scrolling sideways in an endless loop in both directions.
  - Five `feature` photos (Quick Sprint, TEDx, Marine Corps League, Duke AI Hackathon, FBLA nationals) stand the
    wall's full height. The other 15 are half-height and flow along two staggered lanes.
  - Every photo keeps its own shape (no cropping to a grid). Gaps, vertical offsets and a tilt of about 1° vary per
    photo, using a steady seeded value so every build looks the same.
  - When a full-height photo would leave a hole in the shorter lane, the waiting photo that best fills it is placed
    there first. The page markup stays in rank order, so the lightbox steps through photos in rank order.
  - Positions are worked out at build time (the frontmatter of `src/pages/gallery.astro`) in units of `--half`.
- Motion (`src/scripts/gallery.ts`):
  - The wall drifts slowly, and pauses on hover, keyboard focus, an open lightbox or a hidden tab.
  - It eases to a stop instead of halting.
  - As a feature photo nears the centre of the screen it zooms in by up to 15%, and its neighbours slide aside.
- Input:
  - A vertical scroll moves the page past the gallery (the wall carries `data-lenis-prevent-horizontal`).
  - Sideways trackpad swipes, touch swipes, Shift + wheel and mouse drags move the wall.
  - Photos and links can't be dragged out of the page.
- Lightbox: a native `<dialog>` with a caption, an optional "Read more" link, ←/→ and Escape. `/gallery#<id>` opens
  that photo directly.
- Reduced motion: no drift, zoom or loop copies; the wall is a still, swipeable row with scroll-snap. Without the
  page script, each photo is a plain link to its full-size image.

## Data
- `src/content/gallery.yaml`: `main.photos[] { id, feature?, file, caption, alt, href? }`, listed in rank order.
- `src/assets/gallery/`: images up to 2400 px, made from the originals.
- `achievements.yaml` rows can name a `photo`. They then show a thumbnail that links to `/gallery#<id>`.
- The nav has a "Gallery" link, hidden on phones.

## Tests
- `tests/e2e/gallery.spec.ts`: order, sizes with no overlap, no-drag, lightbox, deep links, drift and pause,
  vertical scroll past the wall, sideways movement both ways, zoom, reduced motion, and the Achievements links.
- `tests/unit/content-rules.test.ts`: photo files exist, ids are unique, and Achievements `photo` references are
  valid.
