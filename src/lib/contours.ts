import { contours } from 'd3-contour';
import { createNoise4D } from 'simplex-noise';
import { mulberry32 } from './random';

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
  cols: 56,
  rows: 35,
  levels: 8,
  seed: 20261003,
  margin: 2,
};

export { mulberry32 };

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

/**
 * A gently rolling height field that repeats every `cols` columns and every `rows` rows, so the artwork
 * tiles seamlessly. Each axis walks once around a circle in 4D noise, which brings it back to its start.
 */
export function createHeightField(cols: number, rows: number, seed: number): (x: number, y: number) => number {
  const noise = createNoise4D(mulberry32(seed));
  // `frequency` is how many noise units one tile width spans; the vertical scale matches, so nothing is stretched.
  const octave = (x: number, y: number, frequency: number, offset: number) => {
    const a = (2 * Math.PI * x) / cols;
    const b = (2 * Math.PI * y) / rows;
    const rx = frequency / (2 * Math.PI);
    const ry = (frequency * rows) / cols / (2 * Math.PI);
    return noise(rx * Math.cos(a) + offset, rx * Math.sin(a) + offset, ry * Math.cos(b) + offset, ry * Math.sin(b));
  };
  return (x, y) => octave(x, y, 1.7, 0) + 0.4 * octave(x, y, 3.9, 11.3);
}

/** The contour artwork as an SVG string: thin level lines over a gently rolling height field. It tiles seamlessly. */
export function contourSvg(overrides: Partial<ContourOptions> = {}): string {
  const { width, height, cols, rows, levels, seed, margin } = { ...DEFAULTS, ...overrides };
  const field = createHeightField(cols, rows, seed);

  // One tile of the field plus `margin` cells on every side. The field repeats, so the lines that run off one
  // edge continue on the opposite edge of the next tile.
  const gridCols = cols + margin * 2;
  const gridRows = rows + margin * 2;
  const values = new Array<number>(gridCols * gridRows);
  let min = Infinity;
  let max = -Infinity;
  for (let y = 0; y < gridRows; y++) {
    for (let x = 0; x < gridCols; x++) {
      const value = field(x - margin, y - margin);
      values[y * gridCols + x] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  const thresholds = Array.from({ length: levels }, (_, index) => min + ((max - min) * (index + 1)) / (levels + 1));
  const scaleX = width / cols;
  const scaleY = height / rows;
  const project = (point: readonly number[]): Point => [(point[0] - margin) * scaleX, (point[1] - margin) * scaleY];

  let d = '';
  for (const shape of contours().size([gridCols, gridRows]).thresholds(thresholds)(values)) {
    for (const polygon of shape.coordinates) {
      for (const ring of polygon) d += ringToPath(ring, project);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><path d="${d}" fill="none" stroke="#000" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}
