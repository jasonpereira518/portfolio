/**
 * Hover media on /projects, for mouse and trackpad users only (touch keeps the still images).
 *  - A flagship row with a clip plays it over its cover while hovered.
 *  - A card thumbnail opens a larger image, or its clip, in a popup that follows the cursor.
 * Reduced motion and data saver keep the clips off; the popup then shows the still.
 */
const GAP = 20;
const MARGIN = 8;

export function mount(root: HTMLElement): void {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  const clips = !matchMedia('(prefers-reduced-motion: reduce)').matches && !saveData;

  if (clips) {
    for (const feature of root.querySelectorAll<HTMLElement>('.feature')) {
      const video = feature.querySelector<HTMLVideoElement>('.feature__video');
      if (!video) continue;
      video.addEventListener('playing', () => video.classList.add('is-playing'));
      feature.addEventListener('pointerenter', () => void video.play().catch(() => undefined));
      feature.addEventListener('pointerleave', () => {
        video.pause();
        video.currentTime = 0;
        video.classList.remove('is-playing');
      });
    }
  }

  const thumbs = root.querySelectorAll<HTMLElement>('[data-peek]');
  if (thumbs.length === 0) return;

  const peek = document.createElement('div');
  peek.className = 'peek';
  peek.setAttribute('aria-hidden', 'true');
  document.body.append(peek);

  const place = (x: number, y: number) => {
    const { offsetWidth: width, offsetHeight: height } = peek;
    // Right of the cursor, or left of it when that runs off the screen; below it, or slid up to fit.
    const left = x + GAP + width > innerWidth - MARGIN ? x - GAP - width : x + GAP;
    const top = Math.min(y + GAP, innerHeight - MARGIN - height);
    peek.style.transform = `translate3d(${Math.max(MARGIN, left)}px, ${Math.max(MARGIN, top)}px, 0)`;
  };

  const hide = () => {
    peek.classList.remove('is-open');
    peek.querySelector('video')?.pause();
  };

  for (const thumb of thumbs) {
    thumb.addEventListener('pointerenter', (event) => {
      const clip = thumb.dataset.peekVideo;
      let media: HTMLImageElement | HTMLVideoElement;
      if (clip && clips) {
        media = Object.assign(document.createElement('video'), { src: clip, muted: true, loop: true, playsInline: true });
        void media.play().catch(() => undefined);
      } else {
        media = Object.assign(new Image(), { src: thumb.dataset.peek ?? '', alt: '' });
      }
      peek.replaceChildren(media);
      place(event.clientX, event.clientY);
      peek.classList.add('is-open');
    });
    thumb.addEventListener('pointermove', (event) => place(event.clientX, event.clientY));
    // Also fires when the page scrolls the thumbnail out from under a still cursor.
    thumb.addEventListener('pointerleave', hide);
  }
}
