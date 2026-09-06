import { useState } from "react";

/**
 * Manages a "highlighted" index into a list of `length` items, with
 * wrap-around next()/prev() navigation. Useful for any keyboard-navigable
 * list (suggestion dropdowns, menus, etc). Starts at -1 (nothing
 * highlighted); `next()`/`prev()` are no-ops when `length` is 0.
 */
export function useCyclicIndex(length: number) {
  const [index, setIndex] = useState(-1);

  function next() {
    if (length === 0) return;
    setIndex((i) => (i + 1) % length);
  }

  function prev() {
    if (length === 0) return;
    setIndex((i) => (i <= 0 ? length - 1 : i - 1));
  }

  function reset() {
    setIndex(-1);
  }

  return { index, next, prev, reset, set: setIndex };
}
