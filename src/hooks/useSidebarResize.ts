import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

export const MIN_SIDEBAR_WIDTH = 180;
export const DEFAULT_SIDEBAR_WIDTH = 250;
export const MAX_SIDEBAR_WIDTH = 480;

function maximumWidth() {
  return Math.max(
    MIN_SIDEBAR_WIDTH,
    Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - 320),
  );
}
function clamp(width: number) {
  return Math.max(MIN_SIDEBAR_WIDTH, Math.min(maximumWidth(), width));
}

export function useSidebarResize() {
  const [width, setWidth] = useState(() => clamp(DEFAULT_SIDEBAR_WIDTH));
  const [isResizing, setIsResizing] = useState(false);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
  }>();
  const sidebarRef = useRef<HTMLElement>(null);
  const [maxWidth, setMaxWidth] = useState(maximumWidth);

  useEffect(() => {
    const resize = () => {
      setMaxWidth(maximumWidth());
      setWidth((previous) => clamp(previous));
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    const startWidth =
      sidebarRef.current?.getBoundingClientRect().width || width;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth,
    };
    setWidth(clamp(startWidth));
    setIsResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    setWidth(
      clamp(drag.current.startWidth + event.clientX - drag.current.startX),
    );
  }
  function stopResizing() {
    drag.current = undefined;
    setIsResizing(false);
  }
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    stopResizing();
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") setWidth((previous) => clamp(previous - 16));
    else if (event.key === "ArrowRight")
      setWidth((previous) => clamp(previous + 16));
    else if (event.key === "Home") setWidth(MIN_SIDEBAR_WIDTH);
    else if (event.key === "End") setWidth(maximumWidth());
    else return;
    event.preventDefault();
  }

  return {
    width,
    maxWidth,
    isResizing,
    sidebarRef,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
    stopResizing,
    resetWidth: () => setWidth(clamp(DEFAULT_SIDEBAR_WIDTH)),
  };
}
