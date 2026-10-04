import { MIN_EDGE, traceBlob } from './blob-outline';

/** The reveal starts no sooner than this after navigation began, so the mark has landed (it rises for 0.6 s). */
const HOLD_MS = 900;
/** ...and no later than this, even if the portrait is still loading, so the intro always ends well before the
    4 s CSS safety in Intro.astro hides it anyway. */
const LATEST_MS = 2500;
const REVEAL_MS = 1100;
/** The canvas holds a quarter of the pixels it covers; the soft edge suits paint. */
const RESOLUTION = 0.5;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Size of the hole at fraction `t` of the reveal, as a fraction of its full reach: it opens quickly into a window
 * around the face (16% of the reach by 35% of the time), then floods out to the screen's edges.
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
 * Where the hole opens and how far it must grow. It opens over the face (the middle of the portrait, 30% of the
 * way down it), kept between a quarter and 60% of the way down the screen; without a portrait, from the centre.
 * Fully open, even its innermost wobble clears the farthest corner, with 5% to spare.
 */
export function holeGeometry(width: number, height: number, face?: Box): { x: number; y: number; reach: number } {
  const hasFace = face !== undefined && face.width > 0 && face.height > 0;
  const x = hasFace ? face.left + face.width / 2 : width / 2;
  const y = hasFace ? Math.min(height * 0.6, Math.max(height * 0.25, face.top + face.height * 0.3)) : height / 2;
  const farthest = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  return { x, y, reach: (farthest / MIN_EDGE) * 1.05 };
}

/** Resolves when the hero portrait can be painted, or straight away on pages without one. Never rejects. */
function portraitReady(): Promise<void> {
  const image = document.querySelector<HTMLImageElement>('.hero__figure img');
  if (!image) return Promise.resolve();
  return image.decode().catch(() => undefined);
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));

/**
 * The first-visit intro: an orange screen with the initials, then a paint-blob hole opens over the face and
 * spreads until the page is revealed. Base.astro's head script decides before first paint whether it plays (it
 * adds `has-intro` to <html> and records the visit); this only runs it.
 */
export function playIntro(): void {
  const html = document.documentElement;
  if (!html.classList.contains('has-intro')) return;
  const finish = () => html.classList.remove('has-intro');

  // A page out of sight gets no animation frames, so the reveal would stall half-way: end the intro at once if the
  // page is hidden now or becomes hidden while it plays.
  if (document.hidden) {
    finish();
    return;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) finish();
  });

  const root = document.querySelector<HTMLElement>('.intro');
  const canvas = root?.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!root || !canvas || !ctx) {
    finish();
    return;
  }
  const colour = getComputedStyle(root).backgroundColor;

  const reveal = () => {
    if (!html.classList.contains('has-intro')) return; // already ended (the page was hidden)
    const width = innerWidth;
    const height = innerHeight;
    canvas.width = Math.max(1, Math.round(width * RESOLUTION));
    canvas.height = Math.max(1, Math.round(height * RESOLUTION));
    // Measured now, after the portrait has loaded, so its box is real.
    const { x, y, reach } = holeGeometry(width, height, document.querySelector('.hero__figure')?.getBoundingClientRect());
    root.dataset.origin = `${Math.round(x)},${Math.round(y)}`;
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

  // Open onto the portrait, not onto an empty hero: wait for it, but not past LATEST_MS.
  const elapsed = performance.now();
  void Promise.all([wait(HOLD_MS - elapsed), Promise.race([portraitReady(), wait(LATEST_MS - elapsed)])]).then(reveal);
}
