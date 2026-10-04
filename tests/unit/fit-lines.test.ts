import { describe, expect, test } from 'vitest';
import { fitFontSize } from '../../src/lib/fit-lines';

// A stand-in for laying text out. Each character is 0.8 em wide and each line 0.9 em tall, so text of `chars`
// characters at `size` px needs ceil(chars * 0.8 * size / width) lines: bigger type, more lines, taller text.
const heightOf = (chars: number, width: number) => (size: number) => Math.ceil((chars * 0.8 * size) / width) * size * 0.9;

describe('fitFontSize', () => {
  test('leaves the size alone when the text already fits the height', () => {
    expect(fitFontSize(48, 200, heightOf(6, 300))).toBe(48);
  });

  test('shrinks long text until it fits, but not further than needed', () => {
    const height = heightOf(36, 340);
    const base = 46;
    const budget = 2 * base * 0.9; // two lines of the base size
    expect(height(base)).toBeGreaterThan(budget); // it overflows at the base size
    const size = fitFontSize(base, budget, height);
    expect(size).toBeLessThan(base);
    expect(height(size)).toBeLessThanOrEqual(budget);
    expect(height(size + 1)).toBeGreaterThan(budget); // within a pixel of the largest size that fits
  });

  test('a longer title ends up smaller than a shorter one in the same space', () => {
    const budget = 83;
    const long = fitFontSize(46, budget, heightOf(36, 340));
    const medium = fitFontSize(46, budget, heightOf(20, 340));
    expect(long).toBeLessThan(medium);
  });

  test('never goes below the floor, even if the text still does not fit', () => {
    const floor = 12;
    expect(fitFontSize(46, 5, heightOf(500, 100), floor)).toBe(floor);
  });

  test('the default floor is a share of the base size, so a title is never shrunk out of existence', () => {
    const size = fitFontSize(100, 1, heightOf(500, 100));
    expect(size).toBeGreaterThan(0);
    expect(size).toBeLessThan(100);
  });

  test('keeps the base size when the element measures zero high, as a hidden one does', () => {
    expect(fitFontSize(46, 80, () => 0)).toBe(46);
  });
});
