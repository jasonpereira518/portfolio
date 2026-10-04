import { approach, tiltFor } from '../lib/tilt';

/** Largest turn in degrees: `y` side to side, `x` up and down. Enough to read as 3D, small enough to stay calm. */
const MAX = { x: 6, y: 11 };
/** Share of the remaining turn made each 60 fps frame. */
const EASE = 0.08;

/**
 * Turns the hero portrait towards the mouse in 3D (the transform itself is in Hero.astro). Only for a mouse or
 * pen on a device that can hover; touch screens and reduced motion keep it still.
 */
export function mount(figure: HTMLElement): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const hero = figure.closest<HTMLElement>('.hero');
  if (!hero) return;

  let target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let frame = 0;
  let last = 0;

  const step = (now: number) => {
    frame = 0;
    // Real frame time, capped so a stalled tab does not make the portrait jump when it comes back.
    const dt = last ? Math.min(64, now - last) : 1000 / 60;
    last = now;
    current.x = approach(current.x, target.x, EASE, dt);
    current.y = approach(current.y, target.y, EASE, dt);
    figure.style.setProperty('--tilt-x', `${current.x.toFixed(3)}deg`);
    figure.style.setProperty('--tilt-y', `${current.y.toFixed(3)}deg`);
    if (current.x !== target.x || current.y !== target.y) frame = requestAnimationFrame(step);
    else last = 0; // settled: stop until the pointer moves again
  };
  const start = () => {
    if (!frame) frame = requestAnimationFrame(step);
  };

  hero.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    target = tiltFor(event.clientX, event.clientY, hero.getBoundingClientRect(), MAX);
    start();
  });
  hero.addEventListener('pointerleave', () => {
    target = { x: 0, y: 0 };
    start();
  });

  figure.dataset.tilt = 'ready';
}
