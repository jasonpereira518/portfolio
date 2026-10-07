const SPEED = 24; // drift, in px per second
const IDLE_AFTER_INPUT = 1500; // ms the drift waits after the visitor moves the wall themselves
const ZOOM = 0.15; // a feature photo grows by up to this much as it reaches the middle of the screen
const EASE = 0.14; // share of the remaining distance to its target the wall covers each 60 fps frame

type Tile = { li: HTMLElement; figure: HTMLElement; feature: boolean; left: number; width: number; shift: number };

const smoothstep = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

export function mount(root: HTMLElement): void {
  const scroller = root.querySelector<HTMLElement>('.gallery__scroller');
  const tracks = Array.from(root.querySelectorAll<HTMLElement>('.gallery__track'));
  const real = root.querySelector<HTMLElement>('.gallery__track:not(.gallery__track--copy)');
  const dialog = root.querySelector<HTMLDialogElement>('.gallery__box');
  if (!scroller || !real || tracks.length !== 3 || !dialog) {
    throw new Error('Gallery markup is missing its scroller, its three tracks or its dialog');
  }

  // Only the middle copy of the wall is real; the outer two are inert repeats that let the loop run both ways.
  const links = Array.from(real.querySelectorAll<HTMLAnchorElement>('a[data-index]'));
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Moving the wall ---------------------------------------------------------------------------------------
  // ponytail: drives scrollLeft from one rAF loop, so swipe and trackpad scrolling stay native. If it janks on
  // low-end phones, move the wall to a transformed track instead.
  const paused = new Set<string>();
  let pos = 0; // where the wall is drawn
  let target = 0; // where it is heading: the drift moves this, and pos eases after it (so it glides to a stop)
  let lastInput = -Infinity;
  let lastFrame = 0;
  let drawnAt = NaN;

  // Layout, measured once and again on resize. Offsets ignore the zoom's transforms, so they never feed back.
  let tiles: Tile[] = [];
  let loop = 0; // the width of one copy of the wall
  let home = 0; // scroll position with the real copy's first photo at the left edge
  const measure = () => {
    const before = pos - home;
    tiles = Array.from(scroller.querySelectorAll<HTMLElement>('.gallery__tile')).map((li) => ({
      li,
      figure: li.querySelector('figure')!,
      feature: li.hasAttribute('data-feature'),
      left: li.offsetLeft + (li.offsetParent as HTMLElement).offsetLeft, // placed inside its track
      width: li.offsetWidth,
      shift: 0,
    }));
    loop = tracks[1].offsetLeft - tracks[0].offsetLeft;
    home = real.offsetLeft - parseFloat(getComputedStyle(scroller).paddingLeft);
    pos = target = home + (Number.isFinite(before) ? before : 0);
    drawnAt = NaN;
  };

  // Keeps the view inside the middle copy (half a copy either side), jumping a whole copy when it strays. The
  // copies are identical, so the jump cannot be seen, and the wall can be scrolled forever in either direction.
  const wrap = () => {
    if (pos < home - loop / 2) {
      pos += loop;
      target += loop;
    } else if (pos >= home + loop / 2) {
      pos -= loop;
      target -= loop;
    }
  };

  // Feature photos zoom in near the middle of the screen; every other photo moves aside by the room they need.
  const emphasise = () => {
    const centre = pos + scroller.clientWidth / 2;
    const reach = scroller.clientWidth * 0.55;
    const zooming: { centre: number; half: number }[] = [];
    for (const tile of tiles) {
      if (!tile.feature) continue;
      const middle = tile.left + tile.width / 2;
      const amount = ZOOM * smoothstep(1 - Math.abs(middle - centre) / reach);
      tile.figure.style.scale = amount > 0.001 ? (1 + amount).toFixed(4) : '';
      if (amount > 0.001) zooming.push({ centre: middle, half: (tile.width * amount) / 2 });
    }
    for (const tile of tiles) {
      const middle = tile.left + tile.width / 2;
      let shift = 0;
      for (const zoom of zooming) if (zoom.centre !== middle) shift += Math.sign(middle - zoom.centre) * zoom.half;
      if (Math.abs(shift - tile.shift) > 0.1) {
        tile.shift = shift;
        tile.li.style.translate = shift ? `${shift.toFixed(1)}px 0` : '';
      }
    }
  };

  const frame = (now: number) => {
    const dt = lastFrame ? Math.min(now - lastFrame, 100) : 16.7;
    lastFrame = now;
    // Why the wall is still, for anyone inspecting it (and the e2e tests). Written only when it changes.
    const reasons = [...paused].join(' ');
    if (scroller.dataset.paused !== reasons) scroller.dataset.paused = reasons;

    if (paused.size === 0 && now - lastInput > IDLE_AFTER_INPUT) target += (SPEED * dt) / 1000;
    pos += (target - pos) * (1 - Math.pow(1 - EASE, dt / 16.7));
    if (Math.abs(target - pos) < 0.05) pos = target;
    wrap();
    if (pos !== drawnAt) {
      drawnAt = pos;
      scroller.scrollLeft = pos;
      emphasise();
    }
    requestAnimationFrame(frame);
  };

  if (motion) {
    measure();
    new ResizeObserver(measure).observe(scroller);

    // A scroll the loop did not cause (a swipe, trackpad, drag or focus) moves the wall's position with it.
    scroller.addEventListener('scroll', () => {
      if (Math.abs(scroller.scrollLeft - pos) > 2) {
        pos = target = scroller.scrollLeft;
        lastInput = performance.now();
      }
    });
    scroller.addEventListener('pointerenter', (event) => event.pointerType === 'mouse' && paused.add('hover'));
    scroller.addEventListener('pointerleave', () => paused.delete('hover'));
    scroller.addEventListener('focusin', (event) => {
      if ((event.target as Element).matches(':focus-visible')) paused.add('focus');
    });
    scroller.addEventListener('focusout', () => paused.delete('focus'));
    document.addEventListener('visibilitychange', () =>
      document.hidden ? paused.add('hidden') : paused.delete('hidden'),
    );
    new IntersectionObserver(([entry]) =>
      entry.isIntersecting ? paused.delete('offscreen') : paused.add('offscreen'),
    ).observe(scroller);
    requestAnimationFrame(frame);
    root.dataset.drifting = 'true';
  }

  // A vertical mouse wheel scrolls the page as usual, past the gallery. The wall itself moves with sideways
  // trackpad swipes, Shift + wheel, touch swipes and mouse drags, all native or below.

  // --- Drag to scroll with a mouse (touch and trackpads already scroll natively) ----------------------------
  // The photos and links themselves cannot be dragged out of the page (draggable="false" in the markup).
  let dragFrom: number | null = null;
  let dragged = false;
  scroller.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    dragFrom = event.clientX;
    dragged = false;
  });
  scroller.addEventListener('pointermove', (event) => {
    if (dragFrom === null) return;
    const dx = event.clientX - dragFrom;
    if (!dragged && Math.abs(dx) < 6) return;
    if (!dragged) {
      dragged = true;
      scroller.setPointerCapture(event.pointerId);
      scroller.classList.add('is-dragging');
    }
    dragFrom = event.clientX;
    scroller.scrollLeft -= dx;
  });
  const endDrag = () => {
    dragFrom = null;
    scroller.classList.remove('is-dragging');
  };
  scroller.addEventListener('pointerup', endDrag);
  scroller.addEventListener('pointercancel', endDrag);
  scroller.addEventListener('dragstart', (event) => event.preventDefault());

  // --- Lightbox ----------------------------------------------------------------------------------------------
  const img = dialog.querySelector<HTMLImageElement>('.gallery__box-img')!;
  const caption = dialog.querySelector<HTMLElement>('.gallery__box-caption')!;
  const more = dialog.querySelector<HTMLAnchorElement>('.gallery__box-link')!;
  let current = 0;
  let opener: HTMLElement | null = null;

  const show = (index: number) => {
    current = (index + links.length) % links.length;
    const link = links[current];
    img.src = link.href;
    img.alt = link.querySelector('img')?.alt ?? '';
    caption.textContent = link.querySelector('figcaption')?.textContent ?? '';
    const href = link.dataset.href;
    more.hidden = !href;
    if (href) more.href = href;
  };

  const open = (index: number) => {
    opener = links[index];
    show(index);
    paused.add('dialog');
    dialog.showModal();
  };

  scroller.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-index]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey) return;
    event.preventDefault();
    if (dragged) {
      dragged = false; // the end of a drag is not a click
      return;
    }
    open(Number(link.dataset.index));
  });

  dialog.querySelector('.gallery__box-prev')!.addEventListener('click', () => show(current - 1));
  dialog.querySelector('.gallery__box-next')!.addEventListener('click', () => show(current + 1));
  dialog.querySelector('.gallery__box-close')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(current - 1);
    else if (event.key === 'ArrowRight') show(current + 1);
  });
  // A click on the dark surround (not the photo, caption or buttons) closes it.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog || (event.target as Element).matches('.gallery__box figure')) dialog.close();
  });
  dialog.addEventListener('close', () => {
    paused.delete('dialog');
    opener?.focus({ preventScroll: true });
  });

  // /gallery#<id> (linked from the Achievements page) opens straight to that photo, centred behind the lightbox.
  const linked = links.findIndex((link) => `#${link.id}` === location.hash);
  if (linked >= 0) {
    const li = links[linked].parentElement!;
    const centred = li.offsetLeft + li.offsetWidth / 2 - scroller.clientWidth / 2;
    if (motion) {
      pos = target = centred;
      wrap();
    } else {
      scroller.scrollLeft = centred;
    }
    open(linked);
  }
}
