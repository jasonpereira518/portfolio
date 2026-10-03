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
    // In drift mode keep looping even when the sim is idle, so the ambient stroke can restart after a cancelled touch.
    if (sim.active || drift) schedule();
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
