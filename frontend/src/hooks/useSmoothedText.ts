import { useEffect, useRef, useState } from 'react';

const TICK_MS = 40;
/** Higher = gentler catch-up. 6 drains a backlog in roughly a quarter second. */
const CATCH_UP_DIVISOR = 6;
const MIN_CHARS_PER_TICK = 2;

/**
 * Reveals streamed text at a steady rate instead of in the bursts it arrives in.
 *
 * The server does stream progressively, but the upstream model API delivers a
 * reply as a handful of large chunks — measured on this app, a table-shaped
 * answer arrives as ~13 deltas with a median gap of 500ms and pauses up to 3s.
 * Rendering each chunk the moment it lands therefore looks like freezing and
 * then dumping, even though nothing is stuck.
 *
 * Buffering the text and paying it out per frame turns the same data into
 * something that reads as typing. It costs a little latency on the very last
 * characters, which is why the reveal snaps to the full text the moment the
 * stream ends — nothing is ever left unshown.
 */
export function useSmoothedText(target: string, streaming: boolean): string {
  const [revealed, setRevealed] = useState(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  // A new turn resets the buffer, otherwise the next reply would start already
  // "revealed" up to the length of the previous one.
  useEffect(() => {
    if (target.length < revealed) setRevealed(target.length);
  }, [target, revealed]);

  useEffect(() => {
    if (!streaming) {
      setRevealed(targetRef.current.length);
      return;
    }

    const timer = window.setInterval(() => {
      setRevealed((shown) => {
        const total = targetRef.current.length;
        if (shown >= total) return shown;
        const step = Math.max(
          MIN_CHARS_PER_TICK,
          Math.ceil((total - shown) / CATCH_UP_DIVISOR),
        );
        return Math.min(total, shown + step);
      });
    }, TICK_MS);

    return () => window.clearInterval(timer);
  }, [streaming]);

  return target.slice(0, revealed);
}
