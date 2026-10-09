# Mobile spacing pass

Checked every page (home, `/work`, `/work/case-closed`, `/achievements`, `/gallery`, `/resume`, 404) at 320, 375 and
390px wide, plus 375×667 and 667×375 (landscape) for the hero. At each size the check was: no element extends past
the viewport (clipped decorative layers excluded), and a visual pass of the sections.

## Changes

| # | File | Problem | Fix |
|---|------|---------|-----|
| 1 | `src/components/Nav.astro` | At 320px the name plus Work / Awards / Contact need about 316px but only 288px is available, so "Contact" ran 19px off the right edge on every page. | New `@media (max-width: 360px)` block: grid gap `0.5rem`, name `0.75rem` with no letter-spacing, link gap `0.6rem` and tighter tracking. |
| 2 | `src/components/Button.astro` | At 320px the label in "See the work" wrapped to two lines, so the pill was 50px tall next to a 42px neighbour. | `white-space: nowrap` on `.button`, so all pills stay one line. |
| 3 | `src/components/sections/Hero.astro` | With buttons no longer wrapping text (#2), the two hero pills need more than 288px at 320px. | `flex-wrap: wrap` on `.hero__cta` in the phone layout: they stack, left-aligned, when they cannot sit side by side. |
| 4 | `src/components/sections/Hero.astro` | Phone on its side (667×375): the absolutely positioned footer (tags and wordmark) sat on top of the buttons, 275px footer top vs 284px copy bottom. | `@media (max-width: 720px) and (max-height: 460px)`: `padding-bottom: 7.5rem` on `.hero`, which leaves a 20px gap. Portrait is unchanged. |
| 5 | `src/pages/resume.astro` | At 320px the publication URL could not wrap, so the whole Publication block grew to 340px, 20px past the edge. The block was an implicit `auto` grid column. | `grid-template-columns: minmax(0, 1fr)` on `.resume__block`, so the URL wraps inside the column. The 900px two-column layout overrides it as before. |
| 6 | `src/pages/achievements.astro` | A featured award's link ("Case Closed →") wrapped to its own line but kept its inline `margin-left: 0.4em`, so it sat indented against the text above. | Under 900px: `display: block; margin: 0.4rem 0 0`, so it starts flush left on its own line. Desktop keeps the inline link. |

## Checked, left alone

- Home sections (statement, work tabs and panels, numbers, experience, about collage, footer): spacing fits at 320 to 390.
- `/work`, `/work/case-closed`, 404, gallery: no overflow, spacing consistent.
- Nav links are small touch targets (11px type, about 14px tall). Not a fit problem, so not changed here; padding the
  links on mobile would be the next step if wanted.
