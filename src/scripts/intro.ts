import { traceBlob } from './blob-outline';

/** sessionStorage key: set once the intro has played, so it plays once per visit. Base.astro reads it too. */
const SEEN_KEY = 'jp-intro-seen';
/** The reveal starts no sooner than this after navigation began, so the mark has time to land. */
const HOLD_MS = 750;
const REVEAL_MS = 1100;
/** The canvas holds a quarter of the pixels it covers; the soft edge suits paint. */
const RESOLUTION = 0.5;

/**
 * Size of the hole at fraction `t` of the reveal, as a fraction of the distance it must cover: it opens quickly
 * into a window around the face, then floods out to the screen's edges.
 */
export function opening(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const window = 0.16;
  const split = 0.35;
  if (t < split) return window * (1 - (1 - t / split) ** 3);
  return window + (1 - window) * ((t - split) / (1 - split)) ** 3;
}

/**
 * The first-visit intro: an orange screen with the initials, then a paint-blob hole opens over the face and
 * spreads until the page is revealed. Base.astro decides before first paint whether it plays (the `has-intro`
 * class on <html>); this only runs it.
 */
export function playIntro(): void {
  const html = document.documentElement;
  if (!html.classList.contains('has-intro')) return;
  const finish = () => html.classList.remove('has-intro');
  try {
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Storage became unavailable after the head script read it; nothing to do.
  }

  const root = document.querySelector<HTMLElement>('.intro');
  const canvas = root?.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!root || !canvas || !ctx) {
    finish();
    return;
  }
  const colour = getComputedStyle(root).backgroundColor;

  const reveal = () => {
    const width = innerWidth;
    const height = innerHeight;
    canvas.width = Math.max(1, Math.round(width * RESOLUTION));
    canvas.height = Math.max(1, Math.round(height * RESOLUTION));

    // Open over the face when there is a portrait on screen, otherwise from the centre.
    const face = document.querySelector('.hero__figure')?.getBoundingClientRect();
    const x = face && face.width > 0 ? face.left + face.width / 2 : width / 2;
    const y = face && face.height > 0 ? Math.min(height * 0.6, Math.max(height * 0.25, face.top + face.height * 0.3)) : height / 2;
    // Far enough to clear the farthest corner even where the wobbling edge dips in.
    const reach = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) * 1.25;
    const began = performance.now();

    const paint = (now: number) => {
      const t = Math.min(1, (now - began) / REVEAL_MS);
      ctx.setTransform(RESOLUTION, 0, 0, RESOLUTION, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'destination-out';
      traceBlob(ctx, x, y, reach * opening(t), now * 0.004);
      ctx.fill();
      if (t < 1) requestAnimationFrame(paint);
      else finish();
    };

    // Draw the first frame before the solid background is dropped, so nothing flashes between them.
    paint(began);
    root.dataset.phase = 'reveal';
  };

  setTimeout(reveal, Math.max(0, HOLD_MS - performance.now()));
}
