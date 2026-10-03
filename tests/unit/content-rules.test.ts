import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const CONTENT = join(process.cwd(), 'src', 'content');
const read = (...parts: string[]) => readFileSync(join(CONTENT, ...parts), 'utf8');
const dataFiles = ['site.yaml', 'numbers.yaml', 'experience.yaml', 'education.yaml', 'about.yaml', 'resume.yaml'];
const projectFiles = readdirSync(join(CONTENT, 'projects')).filter((file) => file.endsWith('.md'));
const everything: [string, string][] = [
  ...dataFiles.map((file): [string, string] => [file, read(file)]),
  ...projectFiles.map((file): [string, string] => [`projects/${file}`, read('projects', file)]),
];

describe('content inventory', () => {
  test('there are 17 projects and exactly 4 are flagship', () => {
    expect(projectFiles).toHaveLength(17);
    const flagship = projectFiles.filter((file) => /^kind: flagship$/m.test(read('projects', file)));
    expect(flagship.sort()).toEqual(['case-closed.md', 'gpu-portfolio-engine.md', 'orbit.md', 'streetlab.md']);
  });

  test('graduation is May 2028', () => {
    expect(read('site.yaml')).toContain('graduation: May 2028');
    expect(read('education.yaml')).toContain('May 2028');
  });
});

describe('copy rules from the content spec', () => {
  const banned: [RegExp, string][] = [
    [/VP-level/i, 'say "senior leaders"'],
    [/5-agent/i, 'the AWS app has 4 agents'],
    [/12\+ years/i, 'Scouting was 11 years to the rank'],
    [/for an AWS customer/i, 'the ad-copy scenario was hypothetical'],
    [/deployed to production/i, 'nothing at AWS was deployed to production'],
    [/YOLOv5/i, 'the work used YOLOv3'],
    [/\(\d{3}\)\s*\d{3}-\d{4}/, 'no phone number on the site'],
    [/May 2027/, 'graduation is May 2028'],
  ];

  test.each(everything)('%s avoids banned phrases', (_file, text) => {
    for (const [pattern, reason] of banned) expect(text, reason).not.toMatch(pattern);
  });

  test('GPA appears once, for CPCC only', () => {
    for (const [file, text] of everything) {
      if (file === 'education.yaml') {
        expect(text.match(/GPA/g)).toHaveLength(1);
        expect(text).toContain('4.0 GPA');
      } else {
        expect(text, file).not.toMatch(/GPA/);
      }
    }
  });

  test('Brain Bubble Pop is not described as AI-powered', () => {
    expect(read('projects', 'brain-bubble-pop.md')).not.toMatch(/AI-powered/i);
  });

  test('Intelitrade carries no landing-page figures or link', () => {
    expect(read('projects', 'intelitrade.md')).not.toMatch(/base44|127 investors|\$847/i);
  });
});
