import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    short: z.string(),
    tagline: z.string(),
    kind: z.enum(['flagship', 'card']),
    group: z.enum(['flagship', 'quant', 'fullstack', 'mobile', 'hackathon', 'hardware']),
    order: z.number().int(),
    role: z.string(),
    dates: z.string().optional(),
    status: z.string(),
    summary: z.string(),
    proof: z.array(z.string()).default([]),
    stack: z.array(z.string()).default([]),
    links: z.array(z.object({ label: z.string(), href: z.url() })).default([]),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    // 'contain' shows the whole image on a white ground (for charts); 'cover' crops it to fill the frame.
    coverFit: z.enum(['cover', 'contain']).default('cover'),
    // The project's own main colour, as a hex like #B8805F. Its title is set in it. Without one the title stays ink.
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    problem: z.string().optional(),
    result: z.string().optional(),
  }),
});

const site = defineCollection({
  loader: file('src/content/site.yaml'),
  schema: z.object({
    name: z.string(),
    description: z.string(),
    location: z.string(),
    timezone: z.string(),
    timezoneLabel: z.string(),
    availability: z.string(),
    graduation: z.string(),
    email: z.email(),
    links: z.object({ linkedin: z.url(), github: z.url(), scholar: z.url() }),
    pitch: z.array(z.string()).length(4),
    statement: z.string(),
    marquee: z.string(),
  }),
});

const numbers = defineCollection({
  loader: file('src/content/numbers.yaml'),
  schema: z.object({ order: z.number().int(), numeral: z.string(), caption: z.string() }),
});

const experience = defineCollection({
  loader: file('src/content/experience.yaml'),
  schema: z.object({
    order: z.number().int(),
    org: z.string(),
    role: z.string(),
    place: z.string().optional(),
    dates: z.string(),
    summary: z.string(),
    // The organisation's logo, as a path under src/assets/ (like logos/aws.png): a transparent image, shown left
    // of the name. Without one the row is text only.
    logo: z.string().optional(),
    // The organisation's main colour, as a hex like #FF9900. Its name is set in it. Without one the name stays ink.
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }),
});

const education = defineCollection({
  loader: file('src/content/education.yaml'),
  schema: z.object({
    order: z.number().int(),
    school: z.string(),
    detail: z.string(),
    dates: z.string(),
    // The school's logo, as a path under src/assets/ (like logos/unc.png): a transparent image, shown at the far
    // right of the row. Without one the row is text only.
    logo: z.string().optional(),
  }),
});

const about = defineCollection({
  loader: file('src/content/about.yaml'),
  schema: z.object({
    heading: z.string(),
    bio: z.string(),
    facts: z.array(z.string()).length(4),
    interests: z.array(z.string()).min(1),
    // `alt` describes the photo for people who cannot see it; `caption` is the visible place and year.
    collage: z
      .array(z.object({ file: z.string(), alt: z.string().optional(), caption: z.string().optional() }))
      .min(1),
  }),
});

const certification = z.object({
  name: z.string(),
  // A short code shown large beside the name, like SAA. Only the AWS certifications have one.
  code: z.string().optional(),
  issuer: z.string(),
  issued: z.string(),
  // Month and year the certification lapses, like Jun 2029. Without one it does not expire.
  expires: z.string().optional(),
  id: z.string(),
});

const achievements = defineCollection({
  loader: file('src/content/achievements.yaml'),
  schema: z.object({
    // The headline awards: `result` is the placing (1st of 220+), `meta` the date and place, and `link`/`href` the
    // project it was for, when there is one.
    featured: z
      .array(
        z.object({
          title: z.string(),
          result: z.string(),
          meta: z.string(),
          context: z.string(),
          link: z.string().optional(),
          href: z.string().optional(),
        }),
      )
      .length(6),
    more: z.array(z.object({ title: z.string(), detail: z.string().optional(), href: z.string().optional() })),
    certifications: z.object({ note: z.string(), aws: z.array(certification), other: z.array(certification) }),
    publication: z.object({
      title: z.string(),
      authors: z.array(z.string()).min(1),
      venue: z.string(),
      note: z.string(),
      url: z.url(),
    }),
    talks: z.array(z.object({ title: z.string(), event: z.string(), date: z.string(), note: z.string() })),
  }),
});

export const collections = { projects, site, numbers, experience, education, about, achievements };
