import { describe, expect, test } from 'vitest';
import { MIN_EDGE } from '../../src/scripts/blob-outline';
import { holeGeometry, opening } from '../../src/scripts/intro';

describe('opening', () => {
  test('runs from closed to fully open', () => {
    expect(opening(0)).toBe(0);
    expect(opening(1)).toBe(1);
    expect(opening(-0.5)).toBe(0);
    expect(opening(1.5)).toBe(1);
  });

  test('only ever grows, with no jump', () => {
    let previous = 0;
    for (let step = 1; step <= 1000; step++) {
      const value = opening(step / 1000);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value - previous).toBeLessThan(0.02);
      previous = value;
    }
  });
});

describe('holeGeometry', () => {
  const viewports: [number, number][] = [
    [1440, 900],
    [390, 844],
    [3840, 1100],
    [320, 1400],
    [1024, 768],
  ];

  test.each(viewports)('fully open, the hole covers every corner of a %ix%i screen, even where its edge dips in', (width, height) => {
    const faces = [undefined, { left: 0, top: 0, width: 200, height: 260 }, { left: width - 300, top: height * 0.5, width: 300, height: 400 }];
    for (const face of faces) {
      const { x, y, reach } = holeGeometry(width, height, face);
      for (const [cx, cy] of [
        [0, 0],
        [width, 0],
        [0, height],
        [width, height],
      ]) {
        expect(reach * MIN_EDGE).toBeGreaterThan(Math.hypot(cx - x, cy - y));
      }
    }
  });

  test('opens over the face, kept between a quarter and 60% of the way down the screen', () => {
    const face = { left: 500, top: 300, width: 400, height: 500 };
    expect(holeGeometry(1440, 900, face)).toMatchObject({ x: 700, y: 450 });
    expect(holeGeometry(1440, 900, { ...face, top: -400 }).y).toBe(900 * 0.25);
    expect(holeGeometry(1440, 900, { ...face, top: 900 }).y).toBe(900 * 0.6);
  });

  test('opens from the centre when there is no portrait', () => {
    expect(holeGeometry(1440, 900)).toMatchObject({ x: 720, y: 450 });
    expect(holeGeometry(1440, 900, { left: 0, top: 0, width: 0, height: 0 })).toMatchObject({ x: 720, y: 450 });
  });
});
