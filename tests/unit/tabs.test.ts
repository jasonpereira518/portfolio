import { describe, expect, test } from 'vitest';
import { nextTabIndex } from '../../src/lib/tabs';

describe('nextTabIndex', () => {
  test('arrow right moves forward and wraps to the first tab', () => {
    expect(nextTabIndex('ArrowRight', 0, 4)).toBe(1);
    expect(nextTabIndex('ArrowRight', 3, 4)).toBe(0);
  });

  test('arrow left moves back and wraps to the last tab', () => {
    expect(nextTabIndex('ArrowLeft', 2, 4)).toBe(1);
    expect(nextTabIndex('ArrowLeft', 0, 4)).toBe(3);
  });

  test('home and end jump to the first and last tab', () => {
    expect(nextTabIndex('Home', 2, 4)).toBe(0);
    expect(nextTabIndex('End', 1, 4)).toBe(3);
  });

  test('other keys are ignored', () => {
    expect(nextTabIndex('Enter', 1, 4)).toBeNull();
    expect(nextTabIndex('a', 1, 4)).toBeNull();
  });
});
