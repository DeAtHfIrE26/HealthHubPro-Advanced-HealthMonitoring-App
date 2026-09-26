/**
 * Number easing, driven by requestAnimationFrame rather than an animation
 * library — the whole job is interpolating one number, and the alternative
 * weighed ~18 kB gzipped.
 *
 * The reduced-motion path is the one that matters most: it has to land on the
 * exact target on the very first render, because anything else means a
 * visitor who asked for less motion still sees numbers move.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCountUp } from './useCountUp';

/** Replaces matchMedia for one test. jsdom has no implementation of its own. */
function setReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  );
}

/** Advances rAF by hand so the easing is deterministic. */
function driveFrames(count: number, stepMs = 16) {
  let now = 0;
  const callbacks: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    callbacks.push(cb);
    return callbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('performance', { now: () => now });
  return {
    run: () => {
      for (let i = 0; i < count && callbacks.length > 0; i += 1) {
        now += stepMs;
        const next = callbacks.shift();
        act(() => next?.(now));
      }
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('useCountUp', () => {
  it('lands on the target immediately under reduced motion', () => {
    setReducedMotion(true);
    const { result } = renderHook(() => useCountUp(8613));
    expect(result.current).toBe(8613);
  });

  it('starts from zero on first mount when motion is allowed', () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useCountUp(8613));
    expect(result.current).toBe(0);
  });

  it('eases towards the target and settles exactly on it', () => {
    setReducedMotion(false);
    const frames = driveFrames(200);
    const { result } = renderHook(() => useCountUp(1000, 320));

    frames.run();
    expect(result.current).toBeCloseTo(1000, 5);
  });

  it('never overshoots on the way', () => {
    setReducedMotion(false);
    let now = 0;
    const queue: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queue.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.stubGlobal('performance', { now: () => now });

    const { result } = renderHook(() => useCountUp(500, 320));
    const seen: number[] = [];
    for (let i = 0; i < 60 && queue.length > 0; i += 1) {
      now += 16;
      const next = queue.shift();
      act(() => next?.(now));
      seen.push(result.current);
    }

    expect(Math.max(...seen)).toBeLessThanOrEqual(500);
    // Monotonic: an easing that backtracks reads as a glitch.
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i]!).toBeGreaterThanOrEqual(seen[i - 1]!);
    }
  });

  it('passes a non-finite target straight through rather than animating to NaN', () => {
    setReducedMotion(false);
    const { result } = renderHook(() => useCountUp(Number.NaN));
    expect(Number.isNaN(result.current)).toBe(true);
  });
});
