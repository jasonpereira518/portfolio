import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/** Smooth wheel scrolling for mouse and trackpad users. In-page anchor links scroll smoothly too. */
export function startSmoothScroll(): Lenis {
  return new Lenis({ autoRaf: true, anchors: true });
}
