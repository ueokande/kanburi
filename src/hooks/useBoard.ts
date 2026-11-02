import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback } from "react";
import { useKanbanDispatch, useKanbanState } from "../context/BoardContext";
import type { Status } from "../types";

export function statusForColumn(colNames: string[], colName: string): Status {
  const idx = colNames.indexOf(colName);
  const total = colNames.length;
  if (idx === 0) return "todo";
  if (idx === total - 1) return "done";
  return "todo";
}

export function useBoard() {
  const { board, filePath, isLoading, documents } = useKanbanState();
  const dispatch = useKanbanDispatch();

  /** Open `path` as a tab: focus it if already open, otherwise load it. */
  const loadFromPath = useCallback(
    async (path: string) => {
      const existing = documents.find((d) => d.filePath === path);
      if (existing) {
        dispatch({ type: "SWITCH_TAB", filePath: path });
        return;
      }
      dispatch({ type: "LOAD_START" });
      const loaded = await invoke<import("../types").Board>("load_file", {
        path,
      });
      dispatch({ type: "LOAD_SUCCESS", board: loaded, filePath: path });
    },
    [dispatch, documents],
  );

  const openFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (typeof selected === "string") {
      await loadFromPath(selected);
    }
  }, [loadFromPath]);

  const switchTab = useCallback(
    (path: string) => {
      dispatch({ type: "SWITCH_TAB", filePath: path });
    },
    [dispatch],
  );

  const closeTab = useCallback(
    async (path: string) => {
      await invoke("close_file", { path });
      dispatch({ type: "CLOSE_TAB", filePath: path });
    },
    [dispatch],
  );

  return {
    board,
    filePath,
    isLoading,
    documents,
    openFile,
    loadFromPath,
    switchTab,
    closeTab,
  };
}
