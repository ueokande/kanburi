import { confirm } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { useKanbanState, useKanbanDispatch } from "../context/BoardContext";
import type { Board } from "../types";

export function useSaveBoard() {
  const { filePath } = useKanbanState();
  const dispatch = useKanbanDispatch();

  const saveBoard = useCallback(
    async (board: Board) => {
      try {
        await invoke("save_current_board", { board, force: false });
      } catch (e) {
        if (String(e) !== "CONFLICT") throw e;

        const overwrite = await confirm(
          "The file was modified by another process. Overwrite with your current changes?",
          {
            title: "File Conflict",
            okLabel: "Overwrite",
            cancelLabel: "Reload",
          },
        );

        if (overwrite) {
          await invoke("save_current_board", { board, force: true });
        } else if (filePath) {
          dispatch({ type: "LOAD_START" });
          const reloaded = await invoke<Board>("load_file", {
            path: filePath,
          });
          dispatch({ type: "LOAD_SUCCESS", board: reloaded, filePath });
        }
      }
    },
    [filePath, dispatch],
  );

  return { saveBoard };
}
