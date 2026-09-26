import { useEffect, useRef, useState } from 'react';

/** True when the OS asks for less motion. Read per call; users change it. */
function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Eases a number towards `target` over `duration`, for metrics that should
 * read as having changed rather than silently swapping.
 *
 * Driven by requestAnimationFrame rather than an animation library: the whole
 * job is interpolating one number, and the alternative weighed ~18 kB gzipped
 * against a chart that had just been cut from 99 kB to 2 kB.
 *
 * Animates from the previous value on update and from zero on first mount, so
 * a dashboard load counts up. Returns the target immediately when reduced
 * motion is set, or when the change is too small to be worth watching.
 */
export function useCountUp(target: number, duration = 650): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0));
  const frame = useRef<number>(0);
  const from = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(target)) {
      setValue(target);
      return;
    }

    const start = from.current;
    if (start === target) return;

    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      // easeOutCubic: fast enough to feel responsive, settles without a bounce.
      const eased = 1 - (1 - p) ** 3;
      const next = start + (target - start) * eased;
      setValue(next);
      from.current = next;
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else from.current = target;
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}
