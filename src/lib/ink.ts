export interface InkPoint {
  x: number;
  y: number;
  /** Timestamp in ms when the point was laid down. */
  born: number;
}

/** One continuous line, oldest point first. A new stroke starts each time the pointer re-enters after a release. */
export type InkStroke = readonly InkPoint[];

export interface InkOptions {
  /** How long a point lives, in ms. The tail of the line is this old. */
  life: number;
  /** A point is only added once the line has travelled this far (px), so a jittering hand does not clutter it. */
  minStep: number;
  /** Cap on points across all strokes. The oldest are dropped first. */
  maxPoints: number;
  /** How quickly the line follows the pointer, per 60 fps frame (0–1). */
  ease: number;
  /** Width of the line at the pointer, in CSS pixels. */
  maxWidth: number;
}

export const INK_DEFAULTS: InkOptions = {
  life: 800,
  minStep: 2,
  maxPoints: 160,
  ease: 0.3,
  maxWidth: 14,
};

const FRAME_MS = 1000 / 60;

/** Width of the line at fraction `t` of a point's life, as a share of `maxWidth`: full at the pointer, tapering to a point. */
export function inkWidth(t: number): number {
  if (t < 0 || t >= 1) return 0;
  return (1 - t) ** 0.85;
}

/** An ink line that eases after the pointer. Each point it lays thins and then vanishes, so the line tapers into a tail. */
export function createInk(overrides: Partial<InkOptions> = {}) {
  const options: InkOptions = { ...INK_DEFAULTS, ...overrides };
  let strokes: InkPoint[][] = [];
  let current: InkPoint[] | null = null;
  let target: { x: number; y: number } | null = null;
  let emitter: { x: number; y: number } | null = null;
  /** Where the last point went down. Kept after that point expires, so a still pointer does not re-lay it. */
  let lastLaid: { x: number; y: number } | null = null;
  let lastStep: number | null = null;

  return {
    /** Point the line should travel toward. The first call after a release starts a new stroke there. */
    pointerTo(x: number, y: number): void {
      target = { x, y };
      if (!emitter) emitter = { x, y };
    },

    /** Stop drawing. The line already laid keeps fading, and the next stroke starts apart from it. */
    release(): void {
      target = null;
      emitter = null;
      current = null;
      lastLaid = null;
    },

    /** Advance to time `now` (ms). Returns the live strokes, oldest first. */
    step(now: number): readonly InkStroke[] {
      const elapsed = lastStep === null ? 0 : Math.min(now - lastStep, 64);
      lastStep = now;

      if (target && emitter) {
        const follow = 1 - (1 - options.ease) ** (elapsed / FRAME_MS);
        emitter.x += (target.x - emitter.x) * follow;
        emitter.y += (target.y - emitter.y) * follow;

        if (!current) {
          current = [];
          strokes.push(current);
        }
        if (!lastLaid || Math.hypot(emitter.x - lastLaid.x, emitter.y - lastLaid.y) >= options.minStep) {
          current.push({ x: emitter.x, y: emitter.y, born: now });
          lastLaid = { x: emitter.x, y: emitter.y };
        }
      }

      // Drop expired points. The stroke being drawn stays in the list even when empty, so the next move can extend it.
      for (const stroke of strokes) {
        const fresh = stroke.filter((point) => now - point.born < options.life);
        stroke.length = 0;
        stroke.push(...fresh);
      }

      let excess = strokes.reduce((total, stroke) => total + stroke.length, 0) - options.maxPoints;
      for (const stroke of strokes) {
        if (excess <= 0) break;
        const drop = Math.min(excess, stroke.length);
        stroke.splice(0, drop);
        excess -= drop;
      }
      strokes = strokes.filter((stroke) => stroke.length > 0 || stroke === current);

      return strokes.filter((stroke) => stroke.length > 0);
    },

    /** True while there is ink to draw or a stroke in progress. */
    get active(): boolean {
      return target !== null || strokes.some((stroke) => stroke.length > 0);
    },
  };
}

export type InkSim = ReturnType<typeof createInk>;
