import { describe, expect, test } from 'vitest';
import { isolines } from '../../src/lib/isolines';

const grid = (cols: number, rows: number, f: (i: number, j: number) => number) => {
  const values = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) values[j * cols + i] = f(i, j);
  return values;
};

describe('isolines', () => {
  test('a field that rises left to right gives one straight vertical line at the level', () => {
    const out: number[] = [];
    isolines(grid(6, 5, (i) => i), 6, 5, 2.5, out);
    expect(out.length / 4).toBe(4); // one segment in each of the 4 rows of cells
    for (let k = 0; k < out.length; k += 4) {
      expect(out[k]).toBeCloseTo(2.5);
      expect(out[k + 2]).toBeCloseTo(2.5);
    }
  });

  test('a cone gives a closed ring of segments at the right distance from its centre', () => {
    const out: number[] = [];
    isolines(grid(21, 21, (i, j) => Math.hypot(i - 10, j - 10)), 21, 21, 5.5, out); // 5.5: no grid point lies exactly on the line
    expect(out.length / 4).toBeGreaterThan(20);

    const ends = new Map<string, number>();
    for (let k = 0; k < out.length; k += 2) {
      expect(Math.abs(Math.hypot(out[k] - 10, out[k + 1] - 10) - 5.5)).toBeLessThan(0.15);
      const key = `${out[k].toFixed(5)},${out[k + 1].toFixed(5)}`;
      ends.set(key, (ends.get(key) ?? 0) + 1);
    }
    // Closed: every end point is shared by exactly two segments.
    for (const count of ends.values()) expect(count).toBe(2);
  });

  test('appends nothing when the level is outside the field, and keeps what was already there', () => {
    const out = [1, 2, 3, 4];
    isolines(grid(4, 4, (i, j) => i + j), 4, 4, 99, out);
    expect(out).toEqual([1, 2, 3, 4]);
  });
});
