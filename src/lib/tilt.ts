interface Area {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Degrees to turn the portrait for a pointer at (px, py) over `area`: towards the pointer, by up to `max`, and
 * straight ahead when the pointer is at the area's centre. `y` turns it left or right (positive: pointer on the
 * right); `x` tips it (positive: pointer above the middle).
 */
export function tiltFor(
  px: number,
  py: number,
  area: Area,
  max: { x: number; y: number },
): { x: number; y: number } {
  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  const across = clamp(((px - area.left) / area.width) * 2 - 1);
  const down = clamp(((py - area.top) / area.height) * 2 - 1);
  // "+ 0" turns -0 into 0.
  return { x: -down * max.x + 0, y: across * max.y + 0 };
}

/**
 * One frame of easing from `current` towards `target`: `ease` is the share of the gap closed per 60 fps frame,
 * scaled by the real frame time `dt` (ms) so the motion looks the same at any frame rate. Snaps to the target
 * once within 0.01, so an animation loop can tell it has settled.
 */
export function approach(current: number, target: number, ease: number, dt: number): number {
  const share = 1 - (1 - ease) ** (dt / (1000 / 60));
  const next = current + (target - current) * share;
  return Math.abs(target - next) < 0.01 ? target : next;
}
