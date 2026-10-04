import { formatClock } from '../lib/clock';

type Island = { mount: (el: HTMLElement) => void };

// Script modules loaded only when their section nears the viewport. One line per module.
const islands: Partial<Record<string, () => Promise<Island>>> = {
  'hero-wash': () => import('./hero-wash'),
  showcase: () => import('./showcase'),
  numbers: () => import('./numbers'),
};

// Base.astro adds the `js` class in <head>, before first paint. The marker tells its fallback that this
// script really ran; without the marker the class is removed again and the page shows its no-script layout.
document.documentElement.classList.add('js');
document.documentElement.dataset.scripted = 'true';

// Live clock in the nav.
const clock = document.querySelector<HTMLElement>('[data-clock]');
if (clock) {
  const zone = clock.dataset.tz ?? 'America/New_York';
  const label = clock.dataset.tzLabel ?? 'ET';
  // An invalid time zone makes Intl throw. Log it and stop the clock so the rest of the page still starts.
  const timer = setInterval(() => tick(), 30_000);
  const tick = () => {
    try {
      clock.textContent = formatClock(new Date(), zone, label);
    } catch (error: unknown) {
      console.error('Nav clock failed', error);
      clearInterval(timer);
    }
  };
  tick();
}

// Scale each [data-fit] line so its text exactly fills its box.
const fitTargets = Array.from(document.querySelectorAll<HTMLElement>('[data-fit]'));
const fit = () => {
  for (const el of fitTargets) {
    const inner = el.firstElementChild;
    if (!inner) continue;
    el.style.setProperty('--fit', '1');
    const width = inner.getBoundingClientRect().width;
    if (width > 0) el.style.setProperty('--fit', (el.clientWidth / width).toFixed(4));
  }
};
if (fitTargets.length > 0) {
  void document.fonts.ready.then(fit);
  let queued = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(queued);
    queued = requestAnimationFrame(fit);
  });
}

// Mark elements as they scroll into view.
const inView = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      inView.unobserve(entry.target);
    }
  },
  { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
);
document.querySelectorAll('[data-reveal], [data-inview]').forEach((el) => inView.observe(el));

// Import and mount each island when it comes within 300px of the viewport.
// An island that cannot start is marked data-island-failed so its section can fall back to the
// no-script layout instead of staying half-hidden.
const nearView = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target as HTMLElement;
      nearView.unobserve(el);
      const name = el.dataset.island ?? '';
      const load = islands[name];
      if (!load) {
        console.error(`No script module is registered for data-island="${name}"`);
        el.dataset.islandFailed = 'true';
        continue;
      }
      load()
        .then((island) => island.mount(el))
        .catch((error: unknown) => {
          console.error(`Island "${name}" failed to start`, error);
          el.dataset.islandFailed = 'true';
        });
    }
  },
  { rootMargin: '300px' },
);
document.querySelectorAll<HTMLElement>('[data-island]').forEach((el) => nearView.observe(el));

// Smooth scrolling for mouse and trackpad users, loaded once the browser is idle.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(pointer: fine)').matches) {
  const start = () => {
    import('./smooth')
      .then((module) => module.startSmoothScroll())
      .catch((error: unknown) => console.error('Smooth scrolling failed to start', error));
  };
  if ('requestIdleCallback' in window) requestIdleCallback(start);
  else setTimeout(start, 1);
}
