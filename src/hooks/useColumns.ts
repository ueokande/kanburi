import { invoke } from "@tauri-apps/api/core";
import { useRef } from "react";
import { useKanbanDispatch, useKanbanState, useUIDispatch, useUIState } from "../context/BoardContext";
import type { Board } from "../types";

export function useColumns() {
  const { board } = useKanbanState();
  const { editingColumn, editingName } = useUIState();
  const kanbanDispatch = useKanbanDispatch();
  const uiDispatch = useUIDispatch();
  const renameInputRef = useRef<HTMLInputElement>(null);

  async function saveAndDispatch(updated: Board, action: Parameters<typeof kanbanDispatch>[0]) {
    await invoke("save_current_board", { board: updated });
    kanbanDispatch(action);
  }

  async function addColumn() {
    const name = `Column ${board.columns.length + 1}`;
    const updated: Board = { ...board, columns: [...board.columns, { name }] };
    await saveAndDispatch(updated, { type: "ADD_COLUMN", name });
  }

  async function renameColumn(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    if (board.columns.some((c) => c.name === trimmed)) return;
    const updated: Board = {
      columns: board.columns.map((c) => (c.name === oldName ? { name: trimmed } : c)),
      tasks: board.tasks.map((t) => (t.column === oldName ? { ...t, column: trimmed } : t)),
    };
    await saveAndDispatch(updated, { type: "RENAME_COLUMN", oldName, newName: trimmed });
  }

  async function deleteColumn(name: string) {
    const updated: Board = {
      columns: board.columns.filter((c) => c.name !== name),
      tasks: board.tasks.filter((t) => t.column !== name),
    };
    await saveAndDispatch(updated, { type: "DELETE_COLUMN", name });
  }

  function startRename(name: string) {
    uiDispatch({ type: "START_RENAME_COLUMN", name });
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  function commitRename(oldName: string) {
    renameColumn(oldName, editingName);
    uiDispatch({ type: "CLEAR_EDITING_COLUMN" });
  }

  function cancelRename() {
    uiDispatch({ type: "CANCEL_RENAME_COLUMN" });
  }

  return {
    editingColumn,
    editingName,
    setEditingName: (name: string) => uiDispatch({ type: "SET_EDITING_NAME", name }),
    renameInputRef,
    addColumn,
    startRename,
    commitRename,
    cancelRename,
    deleteColumn,
  };
}
