import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import type { Board } from "../types";

export function useBoardStore() {
  const [board, setBoard] = useState<Board>({ columns: [], tasks: [] });

  const load = useCallback(async () => {
    const loaded = await invoke<Board>("load_board");
    setBoard(loaded);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(updated: Board) {
    await invoke("save_board", { board: updated });
    setBoard(updated);
  }

  return { board, saveBoard: save };
}
