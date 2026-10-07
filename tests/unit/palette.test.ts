import { describe, expect, test } from 'vitest';
import { buildCommands, filterCommands, type PaletteProject } from '../../src/lib/palette';

const site = {
  email: 'me@example.com',
  links: { linkedin: 'https://linkedin.com/in/me', github: 'https://github.com/me', scholar: 'https://scholar.google.com/x' },
};
const projects: PaletteProject[] = [
  { id: 'case-closed', data: { title: 'Case Closed', short: 'Case Closed', tagline: 'Legal research', kind: 'flagship' } },
  { id: 'limit-order-book', data: { title: 'Limit order book', short: 'Order book', tagline: 'C++ matching engine', kind: 'card' } },
];
const commands = buildCommands(site, projects);
const byId = (id: string) => commands.find((command) => command.id === id);
const ids = (list: typeof commands) => list.map((command) => command.id);

describe('buildCommands', () => {
  test('a flagship opens its own page and a card opens its anchor on the index', () => {
    expect(byId('project-case-closed')?.action).toEqual({ type: 'nav', value: '/work/case-closed' });
    expect(byId('project-limit-order-book')?.action).toEqual({ type: 'nav', value: '/work#limit-order-book' });
  });

  test('copies the email and opens the three profiles from the site data', () => {
    expect(byId('link-email')?.action).toEqual({ type: 'copy', value: 'me@example.com' });
    expect(byId('link-linkedin')?.action).toEqual({ type: 'external', value: 'https://linkedin.com/in/me' });
    expect(byId('link-github')?.action).toEqual({ type: 'external', value: 'https://github.com/me' });
    expect(byId('link-scholar')?.action).toEqual({ type: 'external', value: 'https://scholar.google.com/x' });
  });

  test('can open the achievements page', () => {
    expect(byId('page-achievements')?.action).toEqual({ type: 'nav', value: '/achievements' });
  });

  test('lists projects, then pages, then links, so each group is contiguous', () => {
    const order = ['Projects', 'Pages', 'Links'];
    const ranks = commands.map((command) => order.indexOf(command.group));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });
});

describe('filterCommands', () => {
  test('an empty or blank query keeps everything', () => {
    expect(filterCommands(commands, '')).toBe(commands);
    expect(filterCommands(commands, '   ')).toBe(commands);
  });

  test('every token must match, in any order and any case', () => {
    expect(ids(filterCommands(commands, 'CLOSED case'))).toEqual(['project-case-closed']);
  });

  test('matches the hint and the hidden keywords', () => {
    expect(ids(filterCommands(commands, 'matching'))).toEqual(['project-limit-order-book']);
    expect(ids(filterCommands(commands, 'awards'))).toEqual(['page-achievements']);
  });

  test('no match gives an empty list', () => {
    expect(filterCommands(commands, 'zzz')).toEqual([]);
  });
});
