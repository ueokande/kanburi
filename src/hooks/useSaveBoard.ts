import { confirm } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { useKanbanState } from "../context/BoardContext";
import type { Board } from "../types";
import { useBoard } from "./useBoard";

export function useSaveBoard() {
  const { filePath } = useKanbanState();
  const { loadFromPath } = useBoard();

  const saveBoard = useCallback(
    // False means the disk version was reloaded; callers must discard their edit.
    async (board: Board): Promise<boolean> => {
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
          return true;
        } else if (filePath) {
          await loadFromPath(filePath);
        }
        return false;
      }
      return true;
    },
    [filePath, loadFromPath],
  );

  return { saveBoard };
}
