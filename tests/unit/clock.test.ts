import { expect, test } from 'vitest';
import { formatClock } from '../../src/lib/clock';

test('formats the time in the given zone as 24-hour HH:MM plus a label', () => {
  expect(formatClock(new Date('2026-10-03T19:34:00Z'), 'America/New_York', 'ET')).toBe('15:34 ET');
});

test('follows daylight saving changes for the zone', () => {
  expect(formatClock(new Date('2026-01-15T17:05:00Z'), 'America/New_York', 'ET')).toBe('12:05 ET');
});

test('pads midnight as 00, never 24', () => {
  expect(formatClock(new Date('2026-10-03T04:07:00Z'), 'America/New_York', 'ET')).toBe('00:07 ET');
});
