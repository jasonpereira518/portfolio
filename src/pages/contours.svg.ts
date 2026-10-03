import type { APIRoute } from 'astro';
import { contourSvg } from '../lib/contours';

export const GET: APIRoute = () =>
  new Response(contourSvg(), { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
