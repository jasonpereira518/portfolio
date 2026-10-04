import { blobScale, createWash, type Blob, type Tone } from '../lib/wash';
import { traceBlob } from './blob-outline';

/** The canvas holds half as many pixels as it covers: cheaper to fill, and the upscale softens every edge. */
const RESOLUTION = 0.5;
/** On touch screens, a slow automatic stroke starts this long after the last touch. */
const DRIFT_AFTER_MS = 2500;

function paintBlob(ctx: CanvasRenderingContext2D, blob: Blob, now: number, colours: Record<Tone, string>): void {
  const radius = blob.r * blobScale((now - blob.born) / blob.life);
  if (radius < 0.5) return;

  // A circle whose edge wobbles slowly, so the paint looks liquid.
  traceBlob(ctx, blob.x, blob.y, radius, blob.seed * Math.PI * 2 + now * 0.0012);
  ctx.fillStyle = colours[blob.tone];
  ctx.fill();
}

export function mount(hero: HTMLElement): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = hero.querySelector<HTMLCanvasElement>('.hero__wash');
  const zone = hero.querySelector<HTMLElement>('.hero__figure');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !zone || !ctx) return;

  // The paint uses the hero's own theme colours (the paper orange on the paper hero).
  const theme = getComputedStyle(hero);
  const colours: Record<Tone, string> = {
    orange: theme.getPropertyValue('--accent').trim(),
    ink: theme.getPropertyValue('--ink').trim(),
    paper: theme.getPropertyValue('--paper').trim(),
  };

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
    for (const blob of blobs) paintBlob(ctx, blob, now, colours);
    // In drift mode keep looping even when the sim is idle, so the ambient stroke can restart after a cancelled touch.
    if (sim.active || drift) schedule();
  };

  // Only draw while the hero is on screen and the tab is visible.
  const schedule = () => {
    if (!frame && onScreen && !document.hidden) frame = requestAnimationFrame(draw);
  };

  hero.addEventListener('pointermove', (event) => {
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
