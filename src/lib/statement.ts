export interface StatementToken {
  /** One word. */
  text: string;
  /** True when the word was wrapped in *asterisks*. */
  accent: boolean;
  /** Punctuation that directly followed a closing asterisk; shown after the word, without the accent. */
  tail: string;
}

/** Splits copy like "systems that *ship*. I start" into words, marking the accented ones. */
export function parseStatement(source: string): StatementToken[] {
  if ((source.match(/\*/g) ?? []).length % 2 !== 0) throw new Error(`Unbalanced * in "${source}"`);

  const tokens: StatementToken[] = [];
  source.split('*').forEach((segment, index) => {
    const accent = index % 2 === 1;
    let rest = segment;

    // Plain text that starts without a space continues the previous word: the "." after "*ship*".
    if (!accent && tokens.length > 0) {
      const attached = rest.match(/^\S+/);
      if (attached) {
        tokens[tokens.length - 1].tail += attached[0];
        rest = rest.slice(attached[0].length);
      }
    }

    for (const word of rest.split(/\s+/).filter(Boolean)) tokens.push({ text: word, accent, tail: '' });
  });
  return tokens;
}
