import { contours } from 'd3-contour';
import { createNoise2D } from 'simplex-noise';

type Point = [number, number];

export interface ContourOptions {
  width: number;
  height: number;
  /** Columns and rows of the grid the height field is sampled on. */
  cols: number;
  rows: number;
  /** Number of contour lines. */
  levels: number;
  seed: number;
  /** Grid cells kept outside each edge, so lines run off the artwork instead of tracing its border. */
  margin: number;
}

const DEFAULTS: ContourOptions = {
  width: 1600,
  height: 1000,
  cols: 64,
  rows: 40,
  levels: 8,
  seed: 20261003,
  margin: 2,
};

/** Small seeded random generator, so the artwork is identical on every build. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns a closed ring of points into an SVG path of smooth curves through the midpoints of its sides. */
export function ringToPath(
  ring: readonly (readonly number[])[],
  project: (point: readonly number[]) => Point,
): string {
  const points = ring.slice(0, -1).map(project); // the last point repeats the first
  if (points.length < 3) return '';
  const fmt = (value: number) => String(Math.round(value) + 0); // "+ 0" turns -0 into 0
  const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(points[points.length - 1], points[0]);
  let d = `M${fmt(start[0])},${fmt(start[1])}`;
  points.forEach((point, index) => {
    const end = mid(point, points[(index + 1) % points.length]);
    d += `Q${fmt(point[0])},${fmt(point[1])} ${fmt(end[0])},${fmt(end[1])}`;
  });
  return `${d}Z`;
}

/** The contour artwork as an SVG string: thin level lines over a gently rolling height field. */
export function contourSvg(overrides: Partial<ContourOptions> = {}): string {
  const { width, height, cols, rows, levels, seed, margin } = { ...DEFAULTS, ...overrides };
  const noise = createNoise2D(mulberry32(seed));

  const values = new Array<number>(cols * rows);
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const u = x / cols;
      const v = y / cols; // divide both by cols so the field is not stretched
      const value = noise(u * 1.7, v * 1.7) + 0.4 * noise(u * 3.9 + 11.3, v * 3.9 + 4.1);
      values[y * cols + x] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  const thresholds = Array.from({ length: levels }, (_, index) => min + ((max - min) * (index + 1)) / (levels + 1));
  const scaleX = width / (cols - margin * 2);
  const scaleY = height / (rows - margin * 2);
  const project = (point: readonly number[]): Point => [(point[0] - margin) * scaleX, (point[1] - margin) * scaleY];

  let d = '';
  for (const shape of contours().size([cols, rows]).thresholds(thresholds)(values)) {
    for (const polygon of shape.coordinates) {
      for (const ring of polygon) d += ringToPath(ring, project);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${d}" fill="none" stroke="#000" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}
