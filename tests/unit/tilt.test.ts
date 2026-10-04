import { describe, expect, test } from 'vitest';
import { approach, tiltFor } from '../../src/lib/tilt';

const area = { left: 100, top: 50, width: 800, height: 600 };
const max = { x: 5, y: 8 };

describe('tiltFor', () => {
  test('a pointer at the centre of the area leaves the portrait facing straight ahead', () => {
    expect(tiltFor(500, 350, area, max)).toEqual({ x: 0, y: 0 });
  });

  test('the portrait turns towards the side the pointer is on, by up to the maximum', () => {
    expect(tiltFor(900, 350, area, max)).toEqual({ x: 0, y: 8 });
    expect(tiltFor(100, 350, area, max)).toEqual({ x: 0, y: -8 });
    expect(tiltFor(700, 350, area, max).y).toBeCloseTo(4);
  });

  test('pointing above the middle tips the portrait up, below tips it down', () => {
    expect(tiltFor(500, 50, area, max)).toEqual({ x: 5, y: 0 });
    expect(tiltFor(500, 650, area, max)).toEqual({ x: -5, y: 0 });
  });

  test('never turns past the maximum, wherever the pointer goes', () => {
    expect(tiltFor(5000, -5000, area, max)).toEqual({ x: 5, y: 8 });
    expect(tiltFor(-5000, 5000, area, max)).toEqual({ x: -5, y: -8 });
  });
});

describe('approach', () => {
  test('moves part of the way to the target each 60 fps frame, so the turn eases in', () => {
    expect(approach(0, 10, 0.1, 1000 / 60)).toBeCloseTo(1);
  });

  test('covers the same ground over the same time at any frame rate', () => {
    let at60 = 0;
    for (let frame = 0; frame < 6; frame++) at60 = approach(at60, 10, 0.1, 1000 / 60);
    let at30 = 0;
    for (let frame = 0; frame < 3; frame++) at30 = approach(at30, 10, 0.1, 1000 / 30);
    expect(at30).toBeCloseTo(at60, 6);
  });

  test('settles exactly on the target once close enough', () => {
    expect(approach(9.995, 10, 0.1, 16)).toBe(10);
  });
});
