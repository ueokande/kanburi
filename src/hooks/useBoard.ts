import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Board, Status, Task } from "../types";
import { parseTaskInput } from "../utils";

export function useBoard() {
  const [board, setBoard] = useState<Board>({ columns: [], tasks: [] });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({});
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [labelInput, setLabelInput] = useState<Record<string, string>>({});
  const dragTaskId = useRef<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const loadBoard = useCallback(async () => {
    const loaded = await invoke<Board>("load_board");
    setBoard(loaded);
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  async function saveBoard(updated: Board) {
    await invoke("save_board", { board: updated });
    setBoard(updated);
  }

  function statusForColumn(colName: string): Status {
    const idx = board.columns.findIndex((c) => c.name === colName);
    const total = board.columns.length;
    if (idx === 0) return "todo";
    if (idx === total - 1) return "done";
    return "in_progress";
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

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

  // ── Columns ────────────────────────────────────────────────────────────────

  async function addColumn() {
    const name = `Column ${board.columns.length + 1}`;
    await saveBoard({ ...board, columns: [...board.columns, { name }] });
  }

  async function renameColumn(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    if (board.columns.some((c) => c.name === trimmed)) return;
    await saveBoard({
      columns: board.columns.map((c) =>
        c.name === oldName ? { name: trimmed } : c,
      ),
      tasks: board.tasks.map((t) =>
        t.column === oldName ? { ...t, column: trimmed } : t,
      ),
    });
  }

  async function deleteColumn(name: string) {
    await saveBoard({
      columns: board.columns.filter((c) => c.name !== name),
      tasks: board.tasks.filter((t) => t.column !== name),
    });
  }

  function startRenameColumn(name: string) {
    setEditingColumn(name);
    setEditingColumnName(name);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  function commitRename(oldName: string) {
    renameColumn(oldName, editingColumnName);
    setEditingColumn(null);
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

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

  return {
    // State
    board,
    expandedId,
    setExpandedId,
    newTaskText,
    setNewTaskText,
    editingColumn,
    editingColumnName,
    setEditingColumnName,
    labelInput,
    setLabelInput,
    renameInputRef,
    // Task ops
    addTask,
    updateTask,
    deleteTask,
    addLabel,
    removeLabel,
    // Column ops
    addColumn,
    startRenameColumn,
    commitRename,
    setEditingColumn,
    deleteColumn,
    // DnD
    onDragStart,
    onDrop,
  };
}
