import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

export const COLLAPSED_SIDEBAR_WIDTH = 64;
export const MIN_SIDEBAR_WIDTH = 180;
// Snap to the closest of the collapsed width and minimum expanded width.
const SNAP_THRESHOLD = (COLLAPSED_SIDEBAR_WIDTH + MIN_SIDEBAR_WIDTH) / 2;
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

export function useSidebarResize({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const [expandedWidth, setWidth] = useState(() =>
    clamp(DEFAULT_SIDEBAR_WIDTH),
  );
  const width = collapsed ? COLLAPSED_SIDEBAR_WIDTH : expandedWidth;
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

  function resizeTo(requestedWidth: number) {
    const shouldCollapse = requestedWidth <= SNAP_THRESHOLD;
    if (!shouldCollapse) setWidth(clamp(requestedWidth));
    onCollapsedChange(shouldCollapse);
  }

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
    setIsResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    resizeTo(drag.current.startWidth + event.clientX - drag.current.startX);
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
    if (event.key === "ArrowLeft")
      resizeTo(
        width <= MIN_SIDEBAR_WIDTH ? COLLAPSED_SIDEBAR_WIDTH : width - 16,
      );
    else if (event.key === "ArrowRight")
      resizeTo(collapsed ? MIN_SIDEBAR_WIDTH : width + 16);
    else if (event.key === "Home") resizeTo(COLLAPSED_SIDEBAR_WIDTH);
    else if (event.key === "End") resizeTo(maximumWidth());
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
    resetWidth: () => resizeTo(DEFAULT_SIDEBAR_WIDTH),
  };
}
