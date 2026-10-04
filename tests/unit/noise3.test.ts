import { describe, expect, test } from 'vitest';
import { createNoise3 } from '../../src/lib/noise3';

describe('createNoise3', () => {
  const noise = createNoise3(42);

  test('is deterministic for a seed', () => {
    expect(createNoise3(42)(0.3, 1.7, 2.2)).toBe(noise(0.3, 1.7, 2.2));
    expect(createNoise3(43)(0.3, 1.7, 2.2)).not.toBe(noise(0.3, 1.7, 2.2));
  });

  test('stays within [-1, 1] and uses a good part of that range', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let index = 0; index < 5000; index++) {
      const value = noise(index * 0.137, index * 0.071, index * 0.053);
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
    expect(min).toBeGreaterThanOrEqual(-1);
    expect(max).toBeLessThanOrEqual(1);
    expect(max - min).toBeGreaterThan(0.8);
  });

  test('is zero on the lattice and changes smoothly in between', () => {
    expect(noise(3, 5, 7)).toBeCloseTo(0, 10);
    expect(noise(-2, 0, 11)).toBeCloseTo(0, 10);
    const step = 1e-3;
    for (const [x, y, z] of [
      [0.25, 0.5, 0.75],
      [4.9, 1.01, 3.3],
      [-7.6, 2.2, 0.4],
    ]) {
      expect(Math.abs(noise(x + step, y, z) - noise(x, y, z))).toBeLessThan(0.01);
      expect(Math.abs(noise(x, y, z + step) - noise(x, y, z))).toBeLessThan(0.01);
    }
  });
});
