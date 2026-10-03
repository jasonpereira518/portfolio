import { describe, expect, test } from 'vitest';
import { blobScale, createWash } from '../../src/lib/wash';

const half = () => 0.5;
const sequence = (values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe('blobScale', () => {
  test('is zero at birth and at the end of life', () => {
    expect(blobScale(0)).toBe(0);
    expect(blobScale(1)).toBe(0);
  });

  test('holds full size through the middle of life', () => {
    expect(blobScale(0.25)).toBe(1);
    expect(blobScale(0.4)).toBe(1);
  });

  test('shrinks with an ease-in after 40% of life', () => {
    expect(blobScale(0.7)).toBeCloseTo(0.75, 5);
    expect(blobScale(0.9)).toBeLessThan(blobScale(0.7));
  });
});

describe('createWash', () => {
  test('lays one blob at the pointer on the first step', () => {
    const sim = createWash({ random: half });
    sim.pointerTo(100, 120);
    const blobs = sim.step(0);
    expect(blobs).toHaveLength(1);
    expect(blobs[0]).toMatchObject({ x: 100, y: 120, tone: 'orange', born: 0 });
    expect(blobs[0].r).toBe(62); // midpoint of the default 46–78 range
  });

  test('lays blobs along the path exactly one spacing apart, even when the pointer moves fast', () => {
    const sim = createWash({ random: half, spacing: 20, dwell: Infinity });
    sim.pointerTo(0, 50);
    sim.step(0);
    sim.pointerTo(400, 50);
    let blobs = sim.step(0);
    for (let now = 16; now <= 1600; now += 16) blobs = sim.step(now);
    expect(blobs.length).toBeGreaterThan(10);
    for (let index = 1; index < blobs.length; index++) {
      expect(blobs[index].y).toBeCloseTo(50, 5);
      expect(blobs[index].x - blobs[index - 1].x).toBeCloseTo(20, 5);
    }
    expect(blobs[blobs.length - 1].x).toBeLessThanOrEqual(400);
  });

  test('keeps a pool of paint under a pointer that has stopped moving', () => {
    const sim = createWash({ random: half, dwell: 500 });
    sim.pointerTo(100, 100);
    expect(sim.step(0)).toHaveLength(1);
    expect(sim.step(499)).toHaveLength(1);
    expect(sim.step(501)).toHaveLength(2);
  });

  test('blobs expire after their life, and the sim goes idle once released', () => {
    const sim = createWash({ random: half, life: 1000 });
    sim.pointerTo(10, 10);
    sim.step(0);
    sim.release();
    expect(sim.active).toBe(true); // one blob is still fading
    expect(sim.step(999)).toHaveLength(1);
    expect(sim.step(1000)).toHaveLength(0);
    expect(sim.active).toBe(false);
  });

  test('releasing stops new paint', () => {
    const sim = createWash({ random: half, dwell: 100 });
    sim.pointerTo(10, 10);
    sim.step(0);
    sim.release();
    expect(sim.step(500)).toHaveLength(1);
  });

  test('never holds more than maxBlobs', () => {
    const sim = createWash({ random: half, spacing: 1, maxBlobs: 5, dwell: Infinity });
    sim.pointerTo(0, 0);
    sim.step(0);
    sim.pointerTo(500, 0);
    let blobs = sim.step(16);
    for (let now = 32; now < 400; now += 16) blobs = sim.step(now);
    expect(blobs).toHaveLength(5);
  });

  test('sometimes throws a small ink or paper droplet beside the stroke', () => {
    // Order of random draws: radius, seed, droplet roll, angle, distance, tone, droplet seed.
    const sim = createWash({ random: sequence([0.5, 0.1, 0.05, 0, 0, 0.2, 0.9]) });
    sim.pointerTo(100, 100);
    const [main, droplet] = sim.step(0);
    expect(main.tone).toBe('orange');
    expect(droplet.tone).toBe('ink');
    expect(droplet.r).toBeCloseTo(main.r * 0.3, 5);
    expect(droplet.x).toBeCloseTo(100 + main.r * 0.9, 5);
    expect(droplet.y).toBeCloseTo(100, 5);
  });
});
