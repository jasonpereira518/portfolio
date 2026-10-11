/** The ⌘K palette's commands, built from site and project content, and the search that narrows them. No DOM here. */

export type CommandGroup = 'Projects' | 'Pages' | 'Links';

export type CommandAction =
  /** Go to a path or an in-page `#hash`. */
  | { type: 'nav'; value: string }
  /** Open an outside site in a new tab. */
  | { type: 'external'; value: string }
  /** Copy text to the clipboard. */
  | { type: 'copy'; value: string };

export interface Command {
  id: string;
  label: string;
  /** Secondary line: a tagline, an address. Searched too. */
  hint: string;
  group: CommandGroup;
  /** Extra search terms that are not shown. */
  keywords: string;
  action: CommandAction;
}

export interface PaletteSite {
  email: string;
  links: { linkedin: string; github: string; scholar: string };
}

/** The slice of a project entry the palette reads. */
export interface PaletteProject {
  id: string;
  data: { title: string; short: string; tagline: string; kind: 'flagship' | 'card' };
}

const stripProtocol = (url: string) => url.replace(/^https?:\/\//, '');

export function buildCommands(site: PaletteSite, projects: PaletteProject[]): Command[] {
  const projectCommands = projects.map((project): Command => ({
    id: `project-${project.id}`,
    label: project.data.title,
    hint: project.data.tagline,
    group: 'Projects',
    keywords: project.data.short,
    // Only the flagships have a page of their own; a card is an anchor on the index.
    action: { type: 'nav', value: project.data.kind === 'flagship' ? `/work/${project.id}` : `/work#${project.id}` },
  }));

  const pages: [string, string, string][] = [
    ['Home', '/', ''],
    ['Work', '/work', 'projects'],
    ['About', '/#about', 'bio'],
    ['Achievements', '/achievements', 'awards'],
    ['Contact', '#contact', 'email'],
  ];
  const pageCommands = pages.map(([label, value, keywords]): Command => ({
    id: `page-${label.toLowerCase()}`,
    label: `Go to ${label}`,
    hint: value,
    group: 'Pages',
    keywords,
    action: { type: 'nav', value },
  }));

  const linkCommands: Command[] = [
    { id: 'link-email', label: 'Copy email', hint: site.email, group: 'Links', keywords: 'mail address', action: { type: 'copy', value: site.email } },
    { id: 'link-linkedin', label: 'Open LinkedIn', hint: stripProtocol(site.links.linkedin), group: 'Links', keywords: '', action: { type: 'external', value: site.links.linkedin } },
    { id: 'link-github', label: 'Open GitHub', hint: stripProtocol(site.links.github), group: 'Links', keywords: 'code repos', action: { type: 'external', value: site.links.github } },
    { id: 'link-scholar', label: 'Open Google Scholar', hint: stripProtocol(site.links.scholar), group: 'Links', keywords: 'papers research', action: { type: 'external', value: site.links.scholar } },
  ];

  return [...projectCommands, ...pageCommands, ...linkCommands];
}

/** Commands matching every whitespace-separated token of the query, in their original order. An empty query matches all. */
export function filterCommands(commands: Command[], query: string): Command[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return commands;
  return commands.filter((command) => {
    const haystack = `${command.label} ${command.hint} ${command.keywords} ${command.group}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}
