import { describe, expect, test } from 'vitest';
import { contourSvg, mulberry32, ringToPath } from '../../src/lib/contours';

describe('mulberry32', () => {
  test('is deterministic for a seed and stays within [0, 1)', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    for (const value of first) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(mulberry32(8)()).not.toBe(first[0]);
  });
});

describe('ringToPath', () => {
  const identity = (point: readonly number[]): [number, number] => [point[0], point[1]];

  test('draws a closed ring as smooth curves through the midpoints of its sides', () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ];
    expect(ringToPath(square, identity)).toBe('M0,5Q0,0 5,0Q10,0 10,5Q10,10 5,10Q0,10 0,5Z');
  });

  test('rounds coordinates to whole units', () => {
    const triangle = [
      [0.4, 0.4],
      [9.6, 0.4],
      [5, 8.2],
      [0.4, 0.4],
    ];
    expect(ringToPath(triangle, identity)).toMatch(/^M\d+,\d+(Q\d+,\d+ \d+,\d+){3}Z$/);
  });

  test('skips rings too small to draw', () => {
    const sliver = [
      [0, 0],
      [1, 1],
      [0, 0],
    ];
    expect(ringToPath(sliver, identity)).toBe('');
  });
});

describe('contourSvg', () => {
  const svg = contourSvg();

  test('is a 1600 by 1000 SVG with one unfilled, stroked path', () => {
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('viewBox="0 0 1600 1000"');
    expect(svg.match(/<path /g)).toHaveLength(1);
    expect(svg).toContain('fill="none"');
  });

  test('is deterministic, so every build ships the same file', () => {
    expect(contourSvg()).toBe(svg);
  });

  test('draws a useful number of curves and stays small', () => {
    expect((svg.match(/Q/g) ?? []).length).toBeGreaterThan(150);
    expect(svg.length).toBeLessThan(40_000);
  });
});
