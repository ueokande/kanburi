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

  // FLIP animation: snapshot positions → mutate DOM → animate cards that moved.
  function animateCards(taskList: HTMLElement, action: () => void) {
    const cards = Array.from(taskList.children).filter(
      (el) =>
        !(el as HTMLElement).classList.contains("drag-placeholder") &&
        !(el as HTMLElement).hasAttribute("data-dragging"),
    ) as HTMLElement[];

    // Clear any in-progress animation so we snapshot clean layout positions.
    for (const el of cards) {
      el.style.transition = "none";
      el.style.transform = "";
    }
    taskList.getBoundingClientRect(); // flush styles

    const before = new Map(cards.map((el) => [el, el.getBoundingClientRect().top]));

    action();

    for (const el of cards) {
      const oldTop = before.get(el);
      if (oldTop === undefined) continue;
      const delta = oldTop - el.getBoundingClientRect().top;
      if (Math.abs(delta) < 1) continue;
      // Snap to old position, then animate to new.
      el.style.transform = `translateY(${delta}px)`;
      el.getBoundingClientRect(); // force reflow
      el.style.transition = "transform 150ms ease";
      el.style.transform = "";
    }
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
    // Clean up any leftover animation transforms.
    document.querySelectorAll("[data-card-list] li").forEach((el) => {
      (el as HTMLElement).style.transition = "";
      (el as HTMLElement).style.transform = "";
    });
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

    // Returns true when inserting before `el` (null = append) is the card's original position.
    // Skips placeholder siblings so the check is accurate regardless of where the placeholder is.
    function isSamePosition(el: HTMLElement | null): boolean {
      if (el === draggedEl) return true;
      let next: Element | null = draggedEl!.nextElementSibling;
      while (next?.classList.contains("drag-placeholder")) next = next.nextElementSibling;
      return (el as Element | null) === next;
    }

    // Determine where to insert the placeholder.
    let insertBefore: HTMLElement | null = null;
    for (const child of Array.from(taskList.children)) {
      const childEl = child as HTMLElement;
      if (childEl.getBoundingClientRect().bottom >= event.clientY) {
        if (childEl === existingPlaceholder) return;
        if (isSamePosition(childEl)) {
          // Back at original position — remove any existing placeholder.
          if (existingPlaceholder) animateCards(taskList, () => existingPlaceholder.remove());
          return;
        }
        insertBefore = childEl;
        break;
      }
    }

    // Append-to-end: remove placeholder if card is already at the end.
    if (!insertBefore && isSamePosition(null)) {
      if (existingPlaceholder) animateCards(taskList, () => existingPlaceholder.remove());
      return;
    }

    const placeholder = existingPlaceholder ?? makePlaceholder(draggedEl.offsetHeight);

    animateCards(taskList, () => {
      existingPlaceholder?.remove();
      if (insertBefore) {
        taskList.insertBefore(placeholder, insertBefore);
      } else {
        taskList.append(placeholder);
      }
    });
  }

  function onDrop(event: React.DragEvent<HTMLElement>, columnName: string) {
    event.preventDefault();
    const taskId = dragTaskIdRef.current;
    if (!taskId) return;

    const column = event.currentTarget as HTMLElement;
    const taskList = column.querySelector("[data-card-list]") as HTMLElement | null;
    if (!taskList) return;

    const placeholder = taskList.querySelector(".drag-placeholder");

    // No placeholder means the card is at its original position — no move needed.
    if (!placeholder) return;

    const children = Array.from(taskList.children);
    const placeholderIndex = children.indexOf(placeholder as HTMLElement);
    // Account for the dragged element still being in the same column's DOM.
    const draggingBefore = children
      .slice(0, placeholderIndex)
      .filter((el) => (el as HTMLElement).hasAttribute("data-dragging")).length;
    const insertIndex = placeholderIndex - draggingBefore;
    placeholder.remove();

    void moveTask(taskId, columnName, insertIndex);
  }

  return { onDragStart, onDragEnd, onDragOver, onDrop };
}

