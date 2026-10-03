import { describe, expect, test } from 'vitest';
import { formatNumeral, parseNumeral, type ParsedNumeral } from '../../src/lib/count';

const parsed = (text: string): ParsedNumeral => {
  const result = parseNumeral(text);
  if (!result) throw new Error(`"${text}" has no number`);
  return result;
};

describe('parseNumeral', () => {
  test('finds a plain number with a suffix', () => {
    expect(parseNumeral('60+')).toEqual({ prefix: '', value: 60, suffix: '+', grouped: false });
  });

  test('reads thousands separators as part of the number', () => {
    expect(parseNumeral('1,100+')).toEqual({ prefix: '', value: 1100, suffix: '+', grouped: true });
  });

  test('treats letters after the number as suffix', () => {
    expect(parseNumeral('9M+')).toEqual({ prefix: '', value: 9, suffix: 'M+', grouped: false });
  });

  test('counts the last number when there are several', () => {
    expect(parseNumeral('1st of 220+')).toEqual({ prefix: '1st of ', value: 220, suffix: '+', grouped: false });
  });

  test('returns null when there is no number', () => {
    expect(parseNumeral('many')).toBeNull();
  });
});

describe('formatNumeral', () => {
  test.each(['220+', '60+', '9M+', '1,100+', '4'])('%s is reproduced exactly at full progress', (text) => {
    expect(formatNumeral(parsed(text), 1)).toBe(text);
  });

  test('starts from zero', () => {
    expect(formatNumeral(parsed('1,100+'), 0)).toBe('0+');
  });

  test('shows a rounded, grouped value part-way', () => {
    expect(formatNumeral(parsed('1,100+'), 0.5)).toBe('550+');
    expect(formatNumeral(parsed('1,100+'), 0.999)).toBe('1,099+');
  });

  test('clamps progress outside 0 to 1', () => {
    expect(formatNumeral(parsed('60+'), -1)).toBe('0+');
    expect(formatNumeral(parsed('60+'), 2)).toBe('60+');
  });
});
