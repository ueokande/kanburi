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
  const [labelInput, setLabelInput] = useState<Record<string, string>>({});

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

  async function deleteTask(id: string) {
    if (expandedId === id) setExpandedId(null);
    await saveBoard({
      ...board,
      tasks: board.tasks.filter((t) => t.id !== id),
    });
  }

  async function addLabel(taskId: string) {
    const raw = (labelInput[taskId] ?? "").trim().replace(/^#/, "");
    if (!raw) return;
    const task = board.tasks.find((t) => t.id === taskId);
    if (!task || task.labels.includes(raw)) return;
    await updateTask(taskId, { labels: [...task.labels, raw] });
    setLabelInput((p) => ({ ...p, [taskId]: "" }));
  }

  async function removeLabel(taskId: string, label: string) {
    const task = board.tasks.find((t) => t.id === taskId);
    if (!task) return;
    await updateTask(taskId, {
      labels: task.labels.filter((l) => l !== label),
    });
  }

  return {
    expandedId,
    toggleExpand,
    newTaskText,
    setNewTaskText,
    labelInput,
    setLabelInput,
    addTask,
    updateTask,
    deleteTask,
    addLabel,
    removeLabel,
  };
}
