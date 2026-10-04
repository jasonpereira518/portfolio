/**
 * A lower bound on how close the traced edge comes to the centre, as a fraction of `radius` (16 points). The
 * wobble keeps the outline's points at 0.85 or more, and the curves between them cut corners a little; sampling
 * every curve over 20,000 wobble phases found the true minimum at about 0.864. 0.8 leaves a margin.
 */
export const MIN_EDGE = 0.8;

/**
 * Traces (but does not fill) a closed blob whose edge wobbles, so paint looks liquid. Advance `phase` over
 * time to make the edge move. The edge stays between MIN_EDGE and 1.15 times `radius` (for the default 16 points).
 */
export function traceBlob(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, phase: number, points = 16): void {
  const outline: [number, number][] = [];
  for (let index = 0; index < points; index++) {
    const angle = (index / points) * Math.PI * 2;
    const wobble = 1 + 0.1 * Math.sin(angle * 3 + phase) + 0.05 * Math.sin(angle * 5 - phase * 1.7);
    outline.push([x + Math.cos(angle) * radius * wobble, y + Math.sin(angle) * radius * wobble]);
  }

  ctx.beginPath();
  const last = outline[points - 1];
  ctx.moveTo((last[0] + outline[0][0]) / 2, (last[1] + outline[0][1]) / 2);
  for (let index = 0; index < points; index++) {
    const point = outline[index];
    const next = outline[(index + 1) % points];
    ctx.quadraticCurveTo(point[0], point[1], (point[0] + next[0]) / 2, (point[1] + next[1]) / 2);
  }
  ctx.closePath();
}
