import { existsSync } from 'node:fs';
import { join } from 'node:path';

const FILE = 'jason-pereira-resume.pdf';

/** Public URL of the resume PDF, or null until the file has been added to `public/`. */
export const resumePdfUrl: string | null = existsSync(join(process.cwd(), 'public', FILE)) ? `/${FILE}` : null;
