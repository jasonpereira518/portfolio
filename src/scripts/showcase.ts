import { activeIndex, restingScroll, slideOffset, slideProgress } from '../lib/work-slide';

// Pinning and sliding needs room: a wide, tall screen, and no request to cut down on motion. Anywhere else the
// projects stay stacked (the CSS default).
const SLIDER = '(min-width: 801px) and (min-height: 720px) and (prefers-reduced-motion: no-preference)';

export function mount(root: HTMLElement): void {
  const pin = root.querySelector<HTMLElement>('.work__pin');
  const panels = Array.from(root.querySelectorAll<HTMLElement>('.work__panel'));
  const steps = Array.from(root.querySelectorAll<HTMLButtonElement>('.work__step'));
  if (!pin || panels.length === 0 || steps.length !== panels.length) {
    throw new Error(`Showcase needs a pin and one step for every panel, but found ${steps.length} steps and ${panels.length} panels`);
  }

  const media = window.matchMedia(SLIDER);
  let frame = 0;

  const metrics = () => ({ top: pin.getBoundingClientRect().top + window.scrollY, height: pin.offsetHeight });

  const currentProgress = () => {
    const { top, height } = metrics();
    return slideProgress(window.scrollY, top, height, window.innerHeight);
  };

  const update = () => {
    frame = 0;
    if (!media.matches) return;
    const progress = currentProgress();
    const offset = slideOffset(progress, panels.length);
    root.style.setProperty('--offset', offset.toFixed(4));
    root.style.setProperty('--progress', progress.toFixed(4));
    const active = activeIndex(offset);
    steps.forEach((step, index) => step.setAttribute('aria-current', String(index === active)));
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  const goTo = (index: number, behavior: ScrollBehavior) => {
    const { top, height } = metrics();
    window.scrollTo({ top: restingScroll(index, panels.length, top, height, window.innerHeight), behavior });
  };

  const sync = () => {
    if (media.matches) {
      root.dataset.slider = 'on';
      // The covers sit in a row beside the screen, where lazy loading would only start them as they slide in.
      panels.forEach((panel) => panel.querySelector('img')?.setAttribute('loading', 'eager'));
      update();
    } else {
      delete root.dataset.slider;
      root.style.removeProperty('--offset');
      root.style.removeProperty('--progress');
    }
  };

  steps.forEach((step, index) => step.addEventListener('click', () => goTo(index, 'smooth')));

  // Focus can reach a link in a project that is off to the side (the track is clipped, so the browser will not
  // scroll to it): slide that project into view instead.
  panels.forEach((panel, index) => {
    panel.addEventListener('focusin', () => {
      if (media.matches && activeIndex(slideOffset(currentProgress(), panels.length)) !== index) goTo(index, 'auto');
    });
  });

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  media.addEventListener('change', sync);

  sync();
  root.dataset.enhanced = 'true';
}
