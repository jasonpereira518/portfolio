export type Tone = 'orange' | 'ink' | 'paper';

export interface Blob {
  x: number;
  y: number;
  /** Full-size radius in CSS pixels. */
  r: number;
  /** Timestamp in ms when the blob was laid down. */
  born: number;
  /** Lifetime in ms. */
  life: number;
  tone: Tone;
  /** 0–1. Offsets the wobble so neighbouring blobs do not pulse in step. */
  seed: number;
}

export interface WashOptions {
  /** Distance in px between blobs laid along the pointer's path. */
  spacing: number;
  /** Smallest and largest blob radius in px. */
  radius: readonly [number, number];
  /** How long a blob lives, in ms. */
  life: number;
  /** A still pointer lays a fresh blob this often, in ms. */
  dwell: number;
  maxBlobs: number;
  /** How quickly the paint follows the pointer, per 60 fps frame (0–1). */
  ease: number;
  /** Chance that a blob throws a small ink or paper droplet beside it. */
  dropletChance: number;
  /** Random source; replaced in tests. */
  random: () => number;
}

export const WASH_DEFAULTS: WashOptions = {
  spacing: 22,
  radius: [46, 78],
  life: 2600,
  dwell: 780,
  maxBlobs: 90,
  ease: 0.22,
  dropletChance: 0.14,
  random: Math.random,
};

const FRAME_MS = 1000 / 60;
const MAX_SPAWNS_PER_STEP = 12;

/** Size of a blob at fraction `t` of its life: quick ease-out growth, a hold, then an ease-in shrink to nothing. */
export function blobScale(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  const grow = 1 - (1 - Math.min(1, t / 0.1)) ** 3;
  const fade = t <= 0.4 ? 1 : 1 - ((t - 0.4) / 0.6) ** 2;
  return grow * fade;
}

/** A paint trail that eases after the pointer, laying blobs that live for a while and then vanish. */
export function createWash(overrides: Partial<WashOptions> = {}) {
  const options: WashOptions = { ...WASH_DEFAULTS, ...overrides };
  let blobs: Blob[] = [];
  let target: { x: number; y: number } | null = null;
  let emitter: { x: number; y: number } | null = null;
  let lastSpawn: { x: number; y: number; at: number } | null = null;
  let lastStep: number | null = null;

  const spawn = (x: number, y: number, now: number) => {
    const [min, max] = options.radius;
    const r = min + (max - min) * options.random();
    blobs.push({ x, y, r, born: now, life: options.life, tone: 'orange', seed: options.random() });
    if (options.random() < options.dropletChance) {
      const angle = options.random() * Math.PI * 2;
      const distance = r * (0.9 + options.random() * 0.5);
      const tone: Tone = options.random() < 0.5 ? 'ink' : 'paper';
      blobs.push({
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        r: r * 0.3,
        born: now,
        life: options.life,
        tone,
        seed: options.random(),
      });
    }
    lastSpawn = { x, y, at: now };
  };

  return {
    /** Point the paint should travel toward. The first call after a release starts a new stroke there. */
    pointerTo(x: number, y: number): void {
      target = { x, y };
      if (!emitter) emitter = { x, y };
    },

    /** Stop painting. Existing blobs keep fading. */
    release(): void {
      target = null;
      emitter = null;
      lastSpawn = null;
    },

    /** Advance to time `now` (ms). Returns the live blobs, oldest first. */
    step(now: number): readonly Blob[] {
      const elapsed = lastStep === null ? 0 : Math.min(now - lastStep, 64);
      lastStep = now;

      if (target && emitter) {
        const follow = 1 - (1 - options.ease) ** (elapsed / FRAME_MS);
        emitter.x += (target.x - emitter.x) * follow;
        emitter.y += (target.y - emitter.y) * follow;

        if (!lastSpawn) {
          spawn(emitter.x, emitter.y, now);
        } else {
          let spawned = 0;
          while (spawned < MAX_SPAWNS_PER_STEP) {
            const dx = emitter.x - lastSpawn.x;
            const dy = emitter.y - lastSpawn.y;
            const gap = Math.hypot(dx, dy);
            if (gap < options.spacing) break;
            spawn(lastSpawn.x + (dx / gap) * options.spacing, lastSpawn.y + (dy / gap) * options.spacing, now);
            spawned++;
          }
          if (spawned === 0 && now - lastSpawn.at >= options.dwell) spawn(emitter.x, emitter.y, now);
        }
      }

      blobs = blobs.filter((blob) => now - blob.born < blob.life);
      if (blobs.length > options.maxBlobs) blobs = blobs.slice(blobs.length - options.maxBlobs);
      return blobs;
    },

    /** True while there is paint to draw or a stroke in progress. */
    get active(): boolean {
      return target !== null || blobs.length > 0;
    },
  };
}

export type WashSim = ReturnType<typeof createWash>;
