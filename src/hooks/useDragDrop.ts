import { useRef } from "react";
import type { Board, Status } from "../types";

export function useDragDrop(
  _board: Board,
  moveTask: (id: string, targetColumn: string, insertIndex: number) => Promise<void>,
  _statusForColumn: (colName: string) => Status,
) {
  const dragTaskIdRef = useRef<string | null>(null);
  // Track the last column entered so we can clean up its placeholder when entering a new one.
  const activeColumnRef = useRef<HTMLElement | null>(null);

  function makePlaceholder(height: number): HTMLLIElement {
    const el = document.createElement("li");
    el.className = "drag-placeholder";
    el.style.height = `${height}px`;
    return el;
  }

  function onDragStart(taskId: string, event: React.DragEvent<HTMLLIElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, textarea, select, a")) {
      event.preventDefault();
      return;
    }
    dragTaskIdRef.current = taskId;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("task", "");
    event.currentTarget.setAttribute("data-dragging", "true");
  }

  function onDragEnd(event: React.DragEvent<HTMLLIElement>) {

    event.currentTarget.removeAttribute("data-dragging");
    document.querySelectorAll(".drag-placeholder").forEach((el) => { el.remove(); });
    activeColumnRef.current = null;
    dragTaskIdRef.current = null;
  }

  function onDragOver(event: React.DragEvent<HTMLElement>) {
    if (!dragTaskIdRef.current) return;
    event.preventDefault();

    const column = event.currentTarget as HTMLElement;

    // Clean up placeholder in previous column when entering a new one.
    if (activeColumnRef.current && activeColumnRef.current !== column) {
      activeColumnRef.current.querySelector(".drag-placeholder")?.remove();
    }
    activeColumnRef.current = column;

    const draggedEl = document.querySelector("[data-dragging]") as HTMLElement | null;
    const taskList = column.querySelector("[data-card-list]") as HTMLElement | null;
    if (!taskList || !draggedEl) return;

    const existingPlaceholder = taskList.querySelector(
      ".drag-placeholder",
    ) as HTMLElement | null;

    if (existingPlaceholder) {
      const rect = existingPlaceholder.getBoundingClientRect();
      if (rect.top <= event.clientY && rect.bottom >= event.clientY) return;
    }

    for (const child of Array.from(taskList.children)) {
      const childEl = child as HTMLElement;
      if (childEl.getBoundingClientRect().bottom >= event.clientY) {
        if (childEl === existingPlaceholder) return;
        existingPlaceholder?.remove();
        if (childEl === draggedEl || childEl.previousElementSibling === draggedEl) return;
        taskList.insertBefore(
          existingPlaceholder ?? makePlaceholder(draggedEl.offsetHeight),
          childEl,
        );
        return;
      }
    }

    existingPlaceholder?.remove();
    if (taskList.lastElementChild === draggedEl) return;
    taskList.append(existingPlaceholder ?? makePlaceholder(draggedEl.offsetHeight));
  }

  function onDrop(event: React.DragEvent<HTMLElement>, columnName: string) {
    event.preventDefault();
    const taskId = dragTaskIdRef.current;
    if (!taskId) return;

    const column = event.currentTarget as HTMLElement;
    const taskList = column.querySelector("[data-card-list]") as HTMLElement | null;
    if (!taskList) return;

    const placeholder = taskList.querySelector(".drag-placeholder");

    let insertIndex: number;
    if (placeholder) {
      const children = Array.from(taskList.children);
      const placeholderIndex = children.indexOf(placeholder as HTMLElement);
      // Account for the dragged element still being in the same column's DOM.
      const draggingBefore = children
        .slice(0, placeholderIndex)
        .filter((el) => (el as HTMLElement).hasAttribute("data-dragging")).length;
      insertIndex = placeholderIndex - draggingBefore;
      placeholder.remove();
    } else {
      // No placeholder (e.g. dragover didn't fire) — append to end.
      insertIndex = Number.MAX_SAFE_INTEGER;
    }

    void moveTask(taskId, columnName, insertIndex);
  }

  return { onDragStart, onDragEnd, onDragOver, onDrop };
}

