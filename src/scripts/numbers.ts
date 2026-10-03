import { formatNumeral, parseNumeral } from '../lib/count';

const DURATION_MS = 1400;

function countUp(el: HTMLElement): void {
  const parsed = parseNumeral(el.dataset.count ?? '');
  if (!parsed) return;
  const start = performance.now();
  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / DURATION_MS);
    el.textContent = formatNumeral(parsed, 1 - (1 - t) ** 3); // ease-out
    if (t < 1) requestAnimationFrame(frame);
    else el.dataset.counted = 'true';
  };
  requestAnimationFrame(frame);
}

export function mount(root: HTMLElement): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        countUp(entry.target as HTMLElement);
      }
    },
    { threshold: 0.6 },
  );
  root.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => observer.observe(el));
}
