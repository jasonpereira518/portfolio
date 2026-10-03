export interface ParsedNumeral {
  /** Text before the number. */
  prefix: string;
  value: number;
  /** Text after the number. */
  suffix: string;
  /** True when the number was written with thousands separators. */
  grouped: boolean;
}

/** Splits a numeral such as "1,100+" around its last number, so that number can be counted up. */
export function parseNumeral(text: string): ParsedNumeral | null {
  const matches = Array.from(text.matchAll(/\d{1,3}(?:,\d{3})+|\d+/g));
  const last = matches[matches.length - 1];
  if (!last) return null;
  const digits = last[0];
  return {
    prefix: text.slice(0, last.index),
    value: Number(digits.replaceAll(',', '')),
    suffix: text.slice(last.index + digits.length),
    grouped: digits.includes(','),
  };
}

/** The numeral as it reads at `progress` (0 to 1) of its count-up. */
export function formatNumeral(parsed: ParsedNumeral, progress: number): string {
  const current = Math.round(parsed.value * Math.min(1, Math.max(0, progress)));
  const shown = parsed.grouped ? current.toLocaleString('en-US') : String(current);
  return `${parsed.prefix}${shown}${parsed.suffix}`;
}
