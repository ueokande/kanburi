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
  const { board, filePath, isLoading } = useKanbanState();
  const dispatch = useKanbanDispatch();

  const loadFromPath = useCallback(
    async (path: string) => {
      dispatch({ type: "LOAD_START" });
      const loaded = await invoke<import("../types").Board>("load_file", { path });
      dispatch({ type: "LOAD_SUCCESS", board: loaded, filePath: path });
    },
    [dispatch],
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

  return { board, filePath, isLoading, openFile, loadFromPath };
}
