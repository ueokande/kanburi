import { useRef, useState } from "react";
import type { Board } from "../types";

export function useColumns(
  board: Board,
  saveBoard: (b: Board) => Promise<void>,
) {
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

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

  function startRename(name: string) {
    setEditingColumn(name);
    setEditingName(name);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  function commitRename(oldName: string) {
    renameColumn(oldName, editingName);
    setEditingColumn(null);
  }

  function cancelRename() {
    setEditingColumn(null);
  }

  return {
    editingColumn,
    editingName,
    setEditingName,
    renameInputRef,
    addColumn,
    startRename,
    commitRename,
    cancelRename,
    deleteColumn,
  };
}
