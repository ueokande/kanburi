import { useRef, useState } from "react";

interface Position {
  top: number;
  left: number;
}

/**
 * Tracks the on-screen position of a floating element (e.g. a popover or
 * suggestion dropdown) anchored just below a reference element.
 *
 * Call `update()` right before showing the floating element (e.g. on
 * focus/click), after the anchor element has rendered, to recompute its
 * position from `anchorRef.current.getBoundingClientRect()`.
 *
 * This is the same "anchor a floating panel to a trigger element" problem
 * solved by libraries like Floating UI (`useFloating`) and Popper.js
 * (`usePopper`), simplified here to the single "flush below, left-aligned"
 * placement this app needs.
 */
export function useFloatingPosition<T extends HTMLElement>(offset = 4) {
  const anchorRef = useRef<T>(null);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 });

  function update() {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + offset, left: rect.left });
  }

  return { anchorRef, position, update };
}
