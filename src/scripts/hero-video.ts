/**
 * Plays the background footage while the hero is on screen. Until its first frame is up (and whenever it cannot
 * play: reduced motion, autoplay refused, data saver on, a decode error) the still beneath it shows instead.
 */
export function mount(hero: HTMLElement): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const video = hero.querySelector<HTMLVideoElement>('.hero__video');
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (!video || saveData) return;

  video.addEventListener('playing', () => video.classList.add('is-playing'), { once: true });
  video.preload = 'auto';
  const play = () => void video.play().catch(() => undefined);
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !document.hidden) play();
    else video.pause();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause();
    else if (hero.getBoundingClientRect().bottom > 0) play();
  });
}
