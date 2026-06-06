import { useState } from "react";
import type { Board, Status, Task } from "../types";
import { parseTaskInput } from "../utils";

export function useTasks(
  board: Board,
  saveBoard: (b: Board) => Promise<void>,
  statusForColumn: (colName: string) => Status,
) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({});

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  async function addTask(column: string) {
    const raw = newTaskText[column] ?? "";
    if (!raw.trim()) return;
    const { text, labels, due_date } = parseTaskInput(raw);
    if (!text) return;
    const task: Task = {
      id: Date.now().toString(),
      text,
      status: statusForColumn(column),
      column,
      labels,
      due_date,
    };
    await saveBoard({ ...board, tasks: [...board.tasks, task] });
    setNewTaskText((p) => ({ ...p, [column]: "" }));
  }

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

    const otherTasks = board.tasks.filter((t) => t.id !== id);
    const columnTasks = otherTasks.filter((t) => t.column === targetColumn);
    const clampedIdx = Math.max(0, Math.min(insertIndex, columnTasks.length));
    const insertBefore = columnTasks[clampedIdx] ?? null;

    // Only update status when the task actually moves to a different column.
    const updatedTask: Task =
      targetColumn === task.column
        ? { ...task }
        : { ...task, column: targetColumn, status: statusForColumn(targetColumn) };

    const newTasks: Task[] = [];
    let inserted = false;
    for (const t of otherTasks) {
      if (!inserted && insertBefore !== null && t.id === insertBefore.id) {
        newTasks.push(updatedTask);
        inserted = true;
      }
      newTasks.push(t);
    }
    if (!inserted) newTasks.push(updatedTask);

    await saveBoard({ ...board, tasks: newTasks });
  }

  async function deleteTask(id: string) {
    if (expandedId === id) setExpandedId(null);
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
    expandedId,
    toggleExpand,
    newTaskText,
    setNewTaskText,
    addTask,
    updateTask,
    moveTask,
    deleteTask,
    addLabel,
    removeLabel,
    sortColumnByDueDate,
  };
}
