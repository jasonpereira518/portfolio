import { createInk, inkWidth, INK_DEFAULTS, type InkStroke } from '../lib/ink';

/** The canvas is sharp on high-density screens but never larger than 2x: a thin line blurs at half resolution. */
const MAX_PIXEL_RATIO = 2;
/** On touch screens, a slow automatic stroke starts this long after the last touch. */
const DRIFT_AFTER_MS = 2500;

interface Offset {
  x: number;
  y: number;
}

/** Curve through `points` with quadratic segments that meet at the midpoints: smooth, with no kinks at the samples. */
function smoothThrough(ctx: CanvasRenderingContext2D, points: readonly Offset[]): void {
  for (let index = 1; index < points.length - 1; index++) {
    const mid = { x: (points[index].x + points[index + 1].x) / 2, y: (points[index].y + points[index + 1].y) / 2 };
    ctx.quadraticCurveTo(points[index].x, points[index].y, mid.x, mid.y);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

/** Fill one stroke as a single tapered shape: thickest at the newest point (with a round cap), a fine point at the oldest. */
function paintStroke(ctx: CanvasRenderingContext2D, stroke: InkStroke, now: number): void {
  const half = (point: InkStroke[number]) => (INK_DEFAULTS.maxWidth / 2) * inkWidth((now - point.born) / INK_DEFAULTS.life);
  const head = stroke[stroke.length - 1];

  if (stroke.length === 1) {
    const radius = half(head);
    if (radius < 0.3) return;
    ctx.beginPath();
    ctx.arc(head.x, head.y, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const left: Offset[] = [];
  const right: Offset[] = [];
  stroke.forEach((point, index) => {
    // Direction of travel here, taken from the neighbours on either side.
    const before = stroke[Math.max(0, index - 1)];
    const after = stroke[Math.min(stroke.length - 1, index + 1)];
    const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    const normal = { x: -(after.y - before.y) / length, y: (after.x - before.x) / length };
    const width = half(point);
    left.push({ x: point.x + normal.x * width, y: point.y + normal.y * width });
    right.push({ x: point.x - normal.x * width, y: point.y - normal.y * width });
  });

  // The round cap at the head sweeps from the left edge, through the direction of travel, to the right edge.
  const previous = stroke[stroke.length - 2];
  const heading = Math.atan2(head.y - previous.y, head.x - previous.x);
  const headRadius = half(head);

  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  smoothThrough(ctx, left);
  ctx.arc(head.x, head.y, headRadius, heading + Math.PI / 2, heading - Math.PI / 2, true);
  smoothThrough(ctx, right.reverse());
  ctx.closePath();
  ctx.fill();
}

export function mount(hero: HTMLElement): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = hero.querySelector<HTMLCanvasElement>('.hero__ink');
  const zone = hero.querySelector<HTMLElement>('.hero__figure');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !zone || !ctx) return;

  // The ink uses the hero's own accent (the paper orange on the paper hero).
  const accent = getComputedStyle(hero).getPropertyValue('--accent').trim();

  const sim = createInk();
  const drift = matchMedia('(pointer: coarse)').matches;
  let frame = 0;
  let onScreen = true;
  let width = 0;
  let height = 0;
  let ratio = 1;
  let lastInput = -Infinity;

  const resize = () => {
    const box = hero.getBoundingClientRect();
    width = box.width;
    height = box.height;
    ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
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
    const strokes = sim.step(now);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    // Resizing the canvas resets its state, so the colour is set on every frame rather than once.
    ctx.fillStyle = accent;
    for (const stroke of strokes) paintStroke(ctx, stroke, now);
    // In drift mode keep looping even when the sim is idle, so the ambient stroke can restart after a cancelled touch.
    if (sim.active || drift) schedule();
  };

  // Only draw while the hero is on screen and the tab is visible.
  const schedule = () => {
    if (!frame && onScreen && !document.hidden) frame = requestAnimationFrame(draw);
  };

  // The trail follows the pointer anywhere over the hero, drawn under the text (Hero.astro layers it).
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
