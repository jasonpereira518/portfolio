/**
 * Traces (but does not fill) a closed blob whose edge wobbles, so paint looks liquid. Advance `phase` over
 * time to make the edge move. The edge stays within 15% of `radius`.
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
