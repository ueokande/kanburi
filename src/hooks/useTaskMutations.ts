import { invoke } from "@tauri-apps/api/core";
import { useKanbanDispatch, useKanbanState } from "../context/BoardContext";
import { statusForColumn } from "./useBoard";
import type { Board, Task } from "../types";
import { buildMovedTaskList } from "../utils";

export function useTaskMutations() {
  const { board } = useKanbanState();
  const dispatch = useKanbanDispatch();
  const colNames = board.columns.map((c) => c.name);
  const getStatus = (colName: string) => statusForColumn(colNames, colName);

  async function saveAndDispatch(updated: Board, action: Parameters<typeof dispatch>[0]) {
    await invoke("save_current_board", { board: updated });
    dispatch(action);
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    const updated: Board = {
      ...board,
      tasks: board.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    };
    await saveAndDispatch(updated, { type: "UPDATE_TASK", id, patch });
  }

  async function moveTask(id: string, targetColumn: string, insertIndex: number) {
    const task = board.tasks.find((t) => t.id === id);
    if (!task) return;
    // Only update status when the task actually moves to a different column.
    const movedTask: Task =
      targetColumn === task.column
        ? { ...task }
        : { ...task, column: targetColumn, status: getStatus(targetColumn) };
    const updated: Board = {
      ...board,
      tasks: buildMovedTaskList(board.tasks, movedTask, targetColumn, insertIndex),
    };
    await saveAndDispatch(updated, { type: "MOVE_TASK", id, targetColumn, insertIndex, statusForColumn: getStatus });
  }

  async function deleteTask(id: string) {
    const updated: Board = { ...board, tasks: board.tasks.filter((t) => t.id !== id) };
    await saveAndDispatch(updated, { type: "DELETE_TASK", id });
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
    await updateTask(taskId, { labels: task.labels.filter((l) => l !== label) });
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
    const updated: Board = { ...board, tasks: [...others, ...sorted] };
    await saveAndDispatch(updated, { type: "SORT_COLUMN_BY_DUE_DATE", column });
  }

  return { updateTask, moveTask, deleteTask, addLabel, removeLabel, sortColumnByDueDate };
}
