import { describe, expect, it } from 'vitest';
import { activeIndex, restingScroll, slideOffset, slideProgress } from '../../src/lib/work-slide';

describe('slideProgress', () => {
  // A pin 3000px tall that starts at 1000px, on a 900px screen: it slides while scrolling from 1000 to 3100.
  it('is 0 before the pin and 1 after it', () => {
    expect(slideProgress(500, 1000, 3000, 900)).toBe(0);
    expect(slideProgress(1000, 1000, 3000, 900)).toBe(0);
    expect(slideProgress(3100, 1000, 3000, 900)).toBe(1);
    expect(slideProgress(9000, 1000, 3000, 900)).toBe(1);
  });

  it('moves linearly through the pin', () => {
    expect(slideProgress(2050, 1000, 3000, 900)).toBeCloseTo(0.5);
  });

  it('is 0 when the pin is no taller than the screen', () => {
    expect(slideProgress(1500, 1000, 900, 900)).toBe(0);
  });
});

describe('slideOffset', () => {
  it('starts on the first project and ends on the last', () => {
    expect(slideOffset(0, 4)).toBe(0);
    expect(slideOffset(1, 4)).toBe(3);
  });

  it('rests on each project, then slides to the next', () => {
    expect(slideOffset(1 / 3, 4)).toBe(1);
    expect(slideOffset(2 / 3, 4)).toBe(2);
    // Just after resting on the first project it has not moved yet; halfway between two it is halfway across.
    expect(slideOffset(0.03, 4)).toBe(0);
    expect(slideOffset(1 / 6, 4)).toBeCloseTo(0.5);
  });

  it('never goes backwards as progress grows', () => {
    let last = 0;
    for (let p = 0; p <= 1; p += 0.01) {
      const offset = slideOffset(p, 4);
      expect(offset).toBeGreaterThanOrEqual(last);
      last = offset;
    }
  });

  it('stays at 0 for a single project and clamps out-of-range progress', () => {
    expect(slideOffset(0.7, 1)).toBe(0);
    expect(slideOffset(-1, 4)).toBe(0);
    expect(slideOffset(2, 4)).toBe(3);
  });
});

describe('activeIndex', () => {
  it('is the nearest project', () => {
    expect(activeIndex(0.4)).toBe(0);
    expect(activeIndex(0.6)).toBe(1);
    expect(activeIndex(3)).toBe(3);
  });
});

describe('restingScroll', () => {
  it('is the scroll position where a project is at rest', () => {
    for (const i of [0, 1, 2, 3]) {
      const y = restingScroll(i, 4, 1000, 3000, 900);
      expect(slideOffset(slideProgress(y, 1000, 3000, 900), 4)).toBe(i);
    }
    expect(restingScroll(0, 4, 1000, 3000, 900)).toBe(1000);
    expect(restingScroll(3, 4, 1000, 3000, 900)).toBe(3100);
  });
});
