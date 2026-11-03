import { COLLAPSED_SIDEBAR_WIDTH } from "../hooks/useSidebarResize";
import type { useSidebarResize } from "../hooks/useSidebarResize";
import styles from "./Sidebar.module.css";

export function SidebarResizeHandle({
  resize,
}: {
  resize: ReturnType<typeof useSidebarResize>;
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: An adjustable window splitter is not a thematic break.
    <div
      role="separator"
      aria-label="Resize sidebar"
      title="Drag to resize; double-click to reset"
      aria-orientation="vertical"
      aria-valuemin={COLLAPSED_SIDEBAR_WIDTH}
      aria-valuemax={resize.maxWidth}
      aria-valuenow={Math.round(resize.width)}
      tabIndex={0}
      className={styles.resizeHandle}
      onPointerDown={resize.onPointerDown}
      onPointerMove={resize.onPointerMove}
      onPointerUp={resize.onPointerUp}
      onPointerCancel={resize.stopResizing}
      onLostPointerCapture={resize.stopResizing}
      onKeyDown={resize.onKeyDown}
      onDoubleClick={resize.resetWidth}
    />
  );
}
