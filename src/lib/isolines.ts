// Marching squares. Edges of a cell: 0 top, 1 right, 2 bottom, 3 left. For each of the 16 ways a cell's four
// corners can sit above or below the level, the pairs of edges its line segments join. Corner bits:
// top-left 8, top-right 4, bottom-right 2, bottom-left 1. The two saddle cases (5 and 10) split the corners apart.
const CASES: readonly (readonly number[])[] = [
  [],
  [3, 2],
  [2, 1],
  [3, 1],
  [0, 1],
  [3, 0, 2, 1],
  [0, 2],
  [3, 0],
  [3, 0],
  [0, 2],
  [0, 1, 3, 2],
  [0, 1],
  [3, 1],
  [2, 1],
  [3, 2],
  [],
];

/**
 * Appends to `out` the line segments where a grid of values crosses `level`, as x1, y1, x2, y2 in grid units
 * (the value at column i, row j sits at (i, j)). `values` is row-major, `cols` by `rows`.
 */
export function isolines(values: ArrayLike<number>, cols: number, rows: number, level: number, out: number[]): void {
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = values[j * cols + i];
      const b = values[j * cols + i + 1];
      const c = values[(j + 1) * cols + i + 1];
      const d = values[(j + 1) * cols + i];
      const edges = CASES[(a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0)];
      for (const edge of edges) {
        // Where the level falls along the edge, by linear interpolation between its two corners.
        if (edge === 0) out.push(i + (level - a) / (b - a), j);
        else if (edge === 1) out.push(i + 1, j + (level - b) / (c - b));
        else if (edge === 2) out.push(i + (level - d) / (c - d), j + 1);
        else out.push(i, j + (level - a) / (d - a));
      }
    }
  }
}
