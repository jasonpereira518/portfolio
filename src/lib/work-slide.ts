/** Share of the slide between two projects spent resting on each of them, so a project holds still before moving on. */
const DWELL = 0.2;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * How far through the pinned section the page has scrolled, 0 to 1. The section slides while the page scrolls from
 * the top of the pin to the point where its bottom meets the bottom of the screen (pinHeight - viewportH further on).
 */
export function slideProgress(scrollY: number, pinTop: number, pinHeight: number, viewportH: number): number {
  const span = pinHeight - viewportH;
  if (span <= 0) return 0;
  return clamp((scrollY - pinTop) / span, 0, 1);
}

/** Where the track is, counted in projects from the first (0) to the last (count - 1). */
export function slideOffset(progress: number, count: number): number {
  if (count < 2) return 0;
  const position = clamp(progress, 0, 1) * (count - 1);
  const from = Math.min(Math.floor(position), count - 2);
  const t = clamp((position - from - DWELL) / (1 - 2 * DWELL), 0, 1);
  return from + t * t * (3 - 2 * t); // smoothstep: eases out of one project and into the next
}

/** The project the track is closest to. */
export function activeIndex(offset: number): number {
  return Math.round(offset);
}

/** The scroll position at which a project sits at rest in the middle of its dwell. */
export function restingScroll(index: number, count: number, pinTop: number, pinHeight: number, viewportH: number): number {
  const span = Math.max(0, pinHeight - viewportH);
  return pinTop + (count < 2 ? 0 : index / (count - 1)) * span;
}
