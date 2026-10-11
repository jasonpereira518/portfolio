/**
 * Hover media on /projects, for mouse and trackpad users only (touch keeps the still images).
 *  - A flagship row with a clip plays it over its cover while hovered.
 *  - Hovering a card opens a preview of its picture (or clip) that follows the cursor, as on jasonpereira.live: it takes
 *    the picture's own shape up to 360 x 300, tilts away from the cursor, and shows the project's title.
 * Reduced motion and data saver keep the clips off; the preview then shows the still.
 */
const GAP = 26;
const PAD = 14;
const MAX_WIDTH = 360;
const MAX_HEIGHT = 300;
const FALLBACK_WIDTH = 280;
const FALLBACK_HEIGHT = 210;

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

  const cards = Array.from(root.querySelectorAll<HTMLElement>('.card')).filter((card) => card.querySelector('[data-peek]'));
  if (cards.length === 0) return;

  // One shared preview, moved from card to card.
  const preview = document.createElement('div');
  preview.id = 'project-hover-preview';
  preview.setAttribute('aria-hidden', 'true');
  const image = document.createElement('img');
  image.className = 'project-hover-preview__image';
  image.alt = '';
  const video = document.createElement('video');
  Object.assign(video, { className: 'project-hover-preview__video', hidden: true, muted: true, loop: true, playsInline: true, preload: 'metadata' });
  const media = document.createElement('div');
  media.className = 'project-hover-preview__media';
  media.append(image, video);
  const title = document.createElement('p');
  title.className = 'project-hover-preview__title';
  preview.append(media, title);
  document.body.append(preview);

  let active: HTMLElement | null = null;
  let hideTimer = 0;
  let lastX = 0;
  let lastY = 0;

  // The preview is as big as the picture, shrunk to fit inside 360 x 300.
  const resize = (width: number, height: number) => {
    const w = width || FALLBACK_WIDTH;
    const h = height || FALLBACK_HEIGHT;
    const scale = Math.min(1, MAX_WIDTH / w, MAX_HEIGHT / h);
    preview.style.width = `${Math.round(w * scale)}px`;
    preview.style.height = `${Math.round(h * scale)}px`;
    if (active && preview.classList.contains('is-visible')) place(lastX, lastY);
  };

  // To the right of the cursor and a little above it; to the left when there is no room; always on screen. The
  // preview tilts away from the cursor, so it leans out to whichever side it is on.
  const place = (x: number, y: number) => {
    lastX = x;
    lastY = y;
    const { offsetWidth: width, offsetHeight: height } = preview;
    const lift = Math.min(56, height * 0.2);
    let left = x + GAP;
    let top = y - lift;
    if (left + width > innerWidth - PAD) left = x - width - GAP;
    if (left < PAD) left = Math.max(PAD, innerWidth - width - PAD);
    if (top + height > innerHeight - PAD) top = innerHeight - height - PAD;
    top = Math.max(PAD, top);
    preview.style.left = `${Math.round(left)}px`;
    preview.style.top = `${Math.round(top)}px`;
    const onRight = left + width / 2 >= x;
    preview.classList.toggle('is-right-side', onRight);
    preview.classList.toggle('is-left-side', !onRight);
  };

  image.addEventListener('load', () => resize(image.naturalWidth, image.naturalHeight));
  video.addEventListener('loadedmetadata', () => resize(video.videoWidth, video.videoHeight));

  const show = (card: HTMLElement) => {
    clearTimeout(hideTimer);
    const source = card.querySelector<HTMLElement>('[data-peek]')!;
    const clip = source.dataset.peekVideo;
    if (clip && clips) {
      if (!video.src.endsWith(clip)) video.src = clip;
      video.hidden = false;
      image.hidden = true;
      resize(video.videoWidth, video.videoHeight);
      void video.play().catch(() => undefined);
    } else {
      const still = source.dataset.peek ?? '';
      if (!image.src.endsWith(still)) image.src = still;
      image.hidden = false;
      video.hidden = true;
      video.pause();
      resize(image.naturalWidth, image.naturalHeight);
    }
    title.textContent = card.querySelector('.card__title')?.textContent?.trim() ?? '';
    active?.classList.remove('is-preview-active');
    active = card;
    card.classList.add('is-preview-active');
    preview.classList.add('is-visible');
    place(lastX, lastY);
  };

  const hide = () => {
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      preview.classList.remove('is-visible');
      video.pause();
      active?.classList.remove('is-preview-active');
      active = null;
    }, 70);
  };

  for (const card of cards) {
    card.addEventListener('mouseenter', (event) => {
      lastX = event.clientX;
      lastY = event.clientY;
      show(card);
    });
    card.addEventListener('mousemove', (event) => {
      if (active === card && preview.classList.contains('is-visible')) place(event.clientX, event.clientY);
    });
    card.addEventListener('mouseleave', hide);
    // Keyboard users reach the card's links, so focusing one shows the preview too.
    card.addEventListener('focusin', () => {
      const rect = card.getBoundingClientRect();
      lastX = rect.left + rect.width / 2;
      lastY = rect.top + rect.height / 2;
      show(card);
    });
    card.addEventListener('focusout', hide);
  }

  const settle = () => {
    if (active && preview.classList.contains('is-visible')) place(lastX, lastY);
  };
  addEventListener('scroll', settle, { passive: true });
  addEventListener('resize', settle);
}
