import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

type Project = CollectionEntry<'projects'>;

/** A flagship project is guaranteed to carry everything its case-study page needs. */
export type Flagship = Project & { data: { cover: string; problem: string; result: string } };

export const GROUP_LABELS = {
  quant: 'Quant and fintech',
  fullstack: 'Full-stack and client work',
  mobile: 'Mobile',
  hackathon: 'Hackathons',
  hardware: 'Hardware',
} as const;

export type CardGroup = keyof typeof GROUP_LABELS;

const byOrder = <T extends { data: { order: number } }>(a: T, b: T) => a.data.order - b.data.order;

export async function getSite() {
  const entry = await getEntry('site', 'main');
  if (!entry) throw new Error('src/content/site.yaml must contain a "main" entry');
  return entry.data;
}

export async function getAbout() {
  const entry = await getEntry('about', 'main');
  if (!entry) throw new Error('src/content/about.yaml must contain a "main" entry');
  return entry.data;
}

export async function getResume() {
  const entry = await getEntry('resume', 'main');
  if (!entry) throw new Error('src/content/resume.yaml must contain a "main" entry');
  return entry.data;
}

export async function getNumbers() {
  return (await getCollection('numbers')).sort(byOrder);
}

export async function getExperience() {
  return (await getCollection('experience')).sort(byOrder);
}

export async function getEducation() {
  return (await getCollection('education')).sort(byOrder);
}

export async function getProjects(): Promise<Project[]> {
  return (await getCollection('projects')).sort(byOrder);
}

function isFlagship(project: Project): project is Flagship {
  const { kind, cover, problem, result } = project.data;
  return kind === 'flagship' && Boolean(cover && problem && result);
}

export async function getFlagship(): Promise<Flagship[]> {
  const candidates = (await getProjects()).filter((project) => project.data.kind === 'flagship');
  const incomplete = candidates.filter((project) => !isFlagship(project));
  if (incomplete.length > 0) {
    const ids = incomplete.map((project) => project.id).join(', ');
    throw new Error(`Flagship projects need cover, problem and result in their frontmatter: ${ids}`);
  }
  return candidates.filter(isFlagship);
}

export async function getCardsByGroup(): Promise<{ group: CardGroup; label: string; projects: Project[] }[]> {
  const cards = (await getProjects()).filter((project) => project.data.kind === 'card');
  return (Object.keys(GROUP_LABELS) as CardGroup[]).map((group) => ({
    group,
    label: GROUP_LABELS[group],
    projects: cards.filter((project) => project.data.group === group),
  }));
}
