import { useEffect, useRef, useState } from 'react';

/**
 * Tracks scroll position inside a given container ref (or the window).
 * Returns a `scrollY` value updated on each animation frame for smooth parallax.
 */
export function useLandingScroll(containerRef?: React.RefObject<HTMLElement>) {
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const update = () => {
      const el = containerRef?.current;
      const isScrollable = el && el.scrollHeight > el.clientHeight && window.getComputedStyle(el).overflowY !== 'visible';
      const y = isScrollable ? el.scrollTop : window.scrollY;
      setScrollY(y);
      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [containerRef]);

  return scrollY;
}
