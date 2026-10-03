import { describe, expect, test } from 'vitest';
import { parseStatement } from '../../src/lib/statement';

describe('parseStatement', () => {
  test('splits plain text into words', () => {
    expect(parseStatement('I build things')).toEqual([
      { text: 'I', accent: false, tail: '' },
      { text: 'build', accent: false, tail: '' },
      { text: 'things', accent: false, tail: '' },
    ]);
  });

  test('marks words wrapped in asterisks as accents and keeps the punctuation after them outside the accent', () => {
    expect(parseStatement('systems that *ship*. I start')).toEqual([
      { text: 'systems', accent: false, tail: '' },
      { text: 'that', accent: false, tail: '' },
      { text: 'ship', accent: true, tail: '.' },
      { text: 'I', accent: false, tail: '' },
      { text: 'start', accent: false, tail: '' },
    ]);
  });

  test('an accent can span several words', () => {
    expect(parseStatement('the *business case* myself.')).toEqual([
      { text: 'the', accent: false, tail: '' },
      { text: 'business', accent: true, tail: '' },
      { text: 'case', accent: true, tail: '' },
      { text: 'myself.', accent: false, tail: '' },
    ]);
  });

  test('handles the real site statement', () => {
    const tokens = parseStatement(
      'I build AI systems that *ship*. I start with the *people* who will use them, *measure* before I claim, and make the *business case* myself.',
    );
    expect(tokens.filter((token) => token.accent).map((token) => token.text)).toEqual([
      'ship',
      'people',
      'measure',
      'business',
      'case',
    ]);
    expect(tokens.map((token) => token.text + token.tail).join(' ')).toBe(
      'I build AI systems that ship. I start with the people who will use them, measure before I claim, and make the business case myself.',
    );
  });

  test('rejects an unbalanced asterisk', () => {
    expect(() => parseStatement('a *broken accent')).toThrow('Unbalanced * in "a *broken accent"');
  });
});
