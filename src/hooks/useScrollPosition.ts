import { useCallback, useRef } from "react";

/**
 * Module-level store of remembered scroll offsets, keyed by an arbitrary
 * string (e.g. a file path, or `${filePath}:${columnName}`). Lives outside
 * React state/refs so it survives the unmount/remount cycles that happen
 * when switching tabs (columns for the previously active tab unmount, and
 * the newly active tab's columns mount fresh).
 */
const scrollPositions = new Map<string, { top: number; left: number }>();

/** Forget any remembered scroll offsets whose key is `key` or starts with
 * `${key}:` (used when a tab is closed, so its entries don't leak forever). */
export function forgetScrollPositions(key: string) {
  for (const stored of scrollPositions.keys()) {
    if (stored === key || stored.startsWith(`${key}:`)) {
      scrollPositions.delete(stored);
    }
  }
}

/**
 * Remembers the scroll position of a scrollable element under `key`, and
 * restores it whenever the element is (re)attached under a different key —
 * which covers both elements that persist across tab switches (e.g. the
 * board container) and elements that fully unmount/remount per tab (e.g. a
 * column's card list), since a callback ref re-fires whenever its identity
 * changes. Pass `null` for `key` to disable tracking (e.g. no tab is open).
 */
export function useScrollPosition(key: string | null) {
  const elRef = useRef<HTMLElement | null>(null);

  const ref = useCallback(
    (el: HTMLElement | null) => {
      elRef.current = el;
      if (!el || !key) return;
      const pos = scrollPositions.get(key);
      el.scrollTop = pos?.top ?? 0;
      el.scrollLeft = pos?.left ?? 0;
    },
    [key],
  );

  const onScroll = useCallback(() => {
    const el = elRef.current;
    if (!el || !key) return;
    scrollPositions.set(key, { top: el.scrollTop, left: el.scrollLeft });
  }, [key]);

  return { ref, onScroll };
}
