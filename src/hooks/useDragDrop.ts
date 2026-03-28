import { useRef } from "react";
import type { Board, Status, Task } from "../types";

export function useDragDrop(
  board: Board,
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>,
  statusForColumn: (colName: string) => Status,
) {
  const dragTaskId = useRef<string | null>(null);

  function onDragStart(taskId: string) {
    dragTaskId.current = taskId;
  }

  async function onDrop(targetColumn: string) {
    const id = dragTaskId.current;
    if (!id) return;
    dragTaskId.current = null;
    const task = board.tasks.find((t) => t.id === id);
    if (!task || task.column === targetColumn) return;
    await updateTask(id, {
      column: targetColumn,
      status: statusForColumn(targetColumn),
    });
  }

  return { onDragStart, onDrop };
}
