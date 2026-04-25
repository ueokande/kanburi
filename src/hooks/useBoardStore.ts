import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useState } from "react";
import type { Board } from "../types";

export function useBoardStore() {
  const [board, setBoard] = useState<Board>({ columns: [], tasks: [] });
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadFromPath = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const loaded = await invoke<Board>("load_file", { path });
      setBoard(loaded);
      setFilePath(path);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openFile = useCallback(async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (typeof selected === "string") {
      await loadFromPath(selected);
    }
  }, [loadFromPath]);

  async function saveBoard(updated: Board) {
    if (!filePath) return;
    await invoke("save_current_board", { board: updated });
    setBoard(updated);
  }

  return { board, filePath, isLoading, openFile, loadFromPath, saveBoard };
}
