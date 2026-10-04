import { isolines } from '../lib/isolines';
import { createNoise3 } from '../lib/noise3';

/** Grid spacing in CSS px. The lines are straight within a cell, so this is also their smoothness. */
const CELL = 8;
/** Contour levels across the field's usual range. Fixed, so lines keep their identity as they move. */
const LEVELS = [-0.42, -0.3, -0.18, -0.06, 0.06, 0.18, 0.3, 0.42];
/** Noise units per second: how fast the shapes change, and how fast they drift up and to the left. */
const MORPH = 0.05;
const DRIFT_X = 0.024;
const DRIFT_Y = 0.014;
/** Slow, smooth motion does not need more than 30 frames a second. */
const FRAME_MS = 1000 / 30;
const LINE_WIDTH = 1.25;
/** Crisp on high-density screens, and still a cap: a 3x canvas costs more than it shows. */
const MAX_DPR = 2;

/**
 * Draws the section's contour lines on a canvas and keeps them changing shape, like a living topographic map.
 * Replaces the static, CSS-drifted artwork once the first frame is drawn. Runs only while on screen.
 */
export function mount(root: HTMLElement): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const staticLines = root.querySelector<HTMLElement>('.contours__lines');
  const canvas = document.createElement('canvas');
  canvas.className = 'contours__canvas';
  const ctx = canvas.getContext('2d');
  if (!staticLines || !ctx) return;
  root.append(canvas);

  // The same colour as the static artwork: the section theme's line colour.
  const colour = getComputedStyle(staticLines).backgroundColor;
  const noise = createNoise3(20261003);
  const segments: number[] = [];
  let values = new Float32Array(0);
  let cols = 0;
  let rows = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let scale = 1;
  let top = 0;
  let frame = 0;
  let last = -Infinity;
  let onScreen = false;

  const resize = () => {
    const box = root.getBoundingClientRect();
    width = box.width;
    height = box.height;
    // Every section samples the same field at its own place on the page, so neighbours never repeat each other.
    top = box.top + scrollY;
    dpr = Math.min(devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    cols = Math.ceil(width / CELL) + 1;
    rows = Math.ceil(height / CELL) + 1;
    values = new Float32Array(cols * rows);
    // One noise unit spans about half the screen width, a little more on phones.
    scale = Math.min(900, Math.max(520, innerWidth * 0.5));
    // Resizing a canvas clears it, and the static artwork is hidden by now: redraw at once, or the lines blink out.
    if (onScreen) {
      last = performance.now();
      render(last / 1000);
    }
  };

  const render = (seconds: number) => {
    const z = seconds * MORPH;
    const ox = seconds * DRIFT_X;
    const oy = seconds * DRIFT_Y;
    for (let j = 0; j < rows; j++) {
      const y = (top + j * CELL) / scale + oy;
      for (let i = 0; i < cols; i++) {
        const x = (i * CELL) / scale + ox;
        // Broad hills plus a finer, weaker layer (offset so the two do not line up) that wrinkles their outlines.
        values[j * cols + i] = noise(x, y, z) + 0.35 * noise(x * 2.1 + 11.3, y * 2.1 + 4.1, z * 1.4);
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    for (const level of LEVELS) {
      segments.length = 0;
      isolines(values, cols, rows, level, segments);
      for (let k = 0; k < segments.length; k += 4) {
        ctx.moveTo(segments[k] * CELL, segments[k + 1] * CELL);
        ctx.lineTo(segments[k + 2] * CELL, segments[k + 3] * CELL);
      }
    }
    ctx.strokeStyle = colour;
    ctx.lineWidth = LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const draw = (now: number) => {
    frame = 0;
    // 4 ms of slack, so a 60 Hz display reliably draws every second frame instead of slipping to every third.
    if (now - last >= FRAME_MS - 4) {
      last = now;
      render(now / 1000);
      root.dataset.live = 'true';
    }
    schedule();
  };

  const schedule = () => {
    if (!frame && onScreen && !document.hidden) frame = requestAnimationFrame(draw);
  };

  new ResizeObserver(resize).observe(root);
  new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting; // the latest entry, if several are queued
    schedule();
  }).observe(root);
  // The observers and listener live as long as the page; each page load starts afresh.
  document.addEventListener('visibilitychange', schedule);
  resize();
}
