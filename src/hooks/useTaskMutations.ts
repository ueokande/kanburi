import type { Board, Status, Task } from "../types";
import { buildMovedTaskList } from "../utils";

export function useTaskMutations(
  board: Board,
  saveBoard: (b: Board) => Promise<void>,
  statusForColumn: (colName: string) => Status,
) {
  async function updateTask(id: string, patch: Partial<Task>) {
    await saveBoard({
      ...board,
      tasks: board.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  }

  async function moveTask(
    id: string,
    targetColumn: string,
    insertIndex: number,
  ) {
    const task = board.tasks.find((t) => t.id === id);
    if (!task) return;

    // Only update status when the task actually moves to a different column.
    const movedTask: Task =
      targetColumn === task.column
        ? { ...task }
        : { ...task, column: targetColumn, status: statusForColumn(targetColumn) };

    await saveBoard({
      ...board,
      tasks: buildMovedTaskList(board.tasks, movedTask, targetColumn, insertIndex),
    });
  }

  async function deleteTask(id: string) {
    await saveBoard({
      ...board,
      tasks: board.tasks.filter((t) => t.id !== id),
    });
  }

  async function addLabel(taskId: string, label: string) {
    const raw = label.trim().replace(/^#/, "");
    if (!raw) return;
    const task = board.tasks.find((t) => t.id === taskId);
    if (!task || task.labels.includes(raw)) return;
    await updateTask(taskId, { labels: [...task.labels, raw] });
  }

  async function removeLabel(taskId: string, label: string) {
    const task = board.tasks.find((t) => t.id === taskId);
    if (!task) return;
    await updateTask(taskId, {
      labels: task.labels.filter((l) => l !== label),
    });
  }

  async function sortColumnByDueDate(column: string) {
    const others = board.tasks.filter((t) => t.column !== column);
    const columnTasks = board.tasks.filter((t) => t.column === column);
    const sorted = [...columnTasks].sort((a, b) => {
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    });
    await saveBoard({ ...board, tasks: [...others, ...sorted] });
  }

  return {
    updateTask,
    moveTask,
    deleteTask,
    addLabel,
    removeLabel,
    sortColumnByDueDate,
  };
}
