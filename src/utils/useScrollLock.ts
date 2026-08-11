import { useLayoutEffect } from 'react';

/** How many overlays currently want the page held still. */
let locks = 0;
let restore: (() => void) | null = null;

/**
 * Hold the page still while an overlay is open.
 *
 * Without this, a flick over a modal's backdrop scrolls the page underneath:
 * you close the modal and find yourself somewhere else entirely, which reads
 * as the page having jumped on its own.
 *
 * The scroll position is pinned rather than simply hidden, because setting
 * `overflow: hidden` on its own makes the browser forget where it was and
 * snap to the top when the lock lifts. Nested overlays are counted, so
 * closing one while another is still open does not release the page early.
 */
export function useScrollLock(active: boolean): void {
  useLayoutEffect(() => {
    if (!active) return;

    locks++;
    if (locks === 1) {
      const y = window.scrollY;
      const { overflow, position, top, width } = document.body.style;
      // Padding replaces the scrollbar's width so the page does not shift
      // sideways as it disappears.
      const gap = window.innerWidth - document.documentElement.clientWidth;
      const paddingEnd = document.body.style.paddingInlineEnd;

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${y}px`;
      document.body.style.width = '100%';
      if (gap > 0) document.body.style.paddingInlineEnd = `${gap}px`;

      restore = () => {
        document.body.style.overflow = overflow;
        document.body.style.position = position;
        document.body.style.top = top;
        document.body.style.width = width;
        document.body.style.paddingInlineEnd = paddingEnd;
        window.scrollTo({ top: y, left: 0, behavior: 'instant' as ScrollBehavior });
      };
    }

    return () => {
      locks = Math.max(0, locks - 1);
      if (locks === 0 && restore) {
        restore();
        restore = null;
      }
    };
  }, [active]);
}
