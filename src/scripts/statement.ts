/** The paragraph's words light up as it rises through the screen: none while its top is at 90% of the viewport
 * height, all once its top reaches 35%. Scrolling back down dims them again in reverse order. */
const START = 0.9;
const END = 0.35;

export function mount(section: HTMLElement): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const text = section.querySelector<HTMLElement>('.statement__text');
  const words = Array.from(section.querySelectorAll<HTMLElement>('.statement__word'));
  if (!text || words.length === 0) return;

  let queued = 0;
  const update = () => {
    queued = 0;
    const top = text.getBoundingClientRect().top / innerHeight;
    const progress = Math.min(1, Math.max(0, (START - top) / (START - END)));
    const lit = Math.round(progress * words.length);
    words.forEach((word, index) => word.classList.toggle('is-lit', index < lit));
  };
  const schedule = () => {
    if (!queued) queued = requestAnimationFrame(update);
  };

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  update();
}
