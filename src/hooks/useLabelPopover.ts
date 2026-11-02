import type { CSSProperties, RefObject } from "react";
import { useLayoutEffect, useRef, useState } from "react";

/** Keep the suggestions next to their input and inside the visible window. */
export function useLabelPopover(
  anchor: RefObject<HTMLInputElement>,
  open: boolean,
  count: number,
) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<CSSProperties>({
    visibility: "hidden",
  });
  useLayoutEffect(() => {
    if (!open || !count) return;
    function update() {
      const input = anchor.current;
      const panel = panelRef.current;
      if (!input || !panel) return;
      const rect = input.getBoundingClientRect();
      const margin = 8;
      const gap = 4;
      const width = Math.min(260, window.innerWidth - margin * 2);
      const below = Math.max(
        0,
        window.innerHeight - rect.bottom - gap - margin,
      );
      const above = Math.max(0, rect.top - gap - margin);
      const desiredHeight = Math.min(panel.scrollHeight, 240);
      const useAbove = below < desiredHeight && above > below;
      const maxHeight = Math.min(240, useAbove ? above : below);
      const height = Math.min(desiredHeight, maxHeight);
      setPosition({
        width,
        maxHeight,
        left: Math.max(
          margin,
          Math.min(rect.left, window.innerWidth - width - margin),
        ),
        top: useAbove
          ? Math.max(margin, rect.top - gap - height)
          : rect.bottom + gap,
        visibility: "visible",
      });
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(update);
    if (anchor.current) observer?.observe(anchor.current);
    if (panelRef.current) observer?.observe(panelRef.current);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer?.disconnect();
    };
  }, [anchor, open, count]);
  return { panelRef, position };
}
