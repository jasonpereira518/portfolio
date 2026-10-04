import { fitFontSize } from '../lib/fit-lines';

/**
 * Keeps each `[data-title-lines="N"]` heading to N lines' worth of height at its natural size. A long title
 * (a long project name) is made smaller until it fits, instead of wrapping onto more lines and pushing the
 * layout around. Titles that already fit are left exactly as the stylesheet sets them.
 */
export function fitTitles(): void {
  const titles = Array.from(document.querySelectorAll<HTMLElement>('[data-title-lines]'));
  if (titles.length === 0) return;

  const fit = (title: HTMLElement) => {
    const lines = Number(title.dataset.titleLines);
    if (!(lines > 0)) return;
    title.style.fontSize = ''; // the stylesheet's size: what the title would be if it never needed shrinking
    const style = getComputedStyle(title);
    const base = parseFloat(style.fontSize);
    const lineHeight = parseFloat(style.lineHeight);
    if (!(base > 0) || !(lineHeight > 0)) return;
    // Half a pixel over, so rounding in the layout does not shrink a title that exactly fits.
    const budget = lines * lineHeight + 0.5;
    const size = fitFontSize(base, budget, (px) => {
      title.style.fontSize = `${px}px`;
      // A word wider than its box spills out sideways instead of adding a line (when the heading does not break
      // words): count that as not fitting, so the title shrinks until its longest word fits.
      if (title.scrollWidth > title.clientWidth + 1) return Infinity;
      return title.getBoundingClientRect().height;
    });
    title.style.fontSize = size === base ? '' : `${size.toFixed(1)}px`;
  };

  let queued = 0;
  const fitAll = () => {
    cancelAnimationFrame(queued);
    queued = requestAnimationFrame(() => titles.forEach(fit));
  };

  // A title is refitted when its container changes width: a window resize, or a hidden tab panel being shown
  // (its container goes from no size to its size). Fitting changes the container's height, not its width, and a
  // refit with nothing new to do changes nothing, so this settles.
  const observer = new ResizeObserver(fitAll);
  new Set(titles.map((title) => title.parentElement)).forEach((parent) => parent && observer.observe(parent));
  void document.fonts.ready.then(fitAll); // the webfont is wider or narrower than its fallback
  titles.forEach(fit);
}
