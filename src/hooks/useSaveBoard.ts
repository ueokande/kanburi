import { confirm } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { useCallback } from "react";
import { useKanbanState, useSaveStatus } from "../context/BoardContext";
import { trackPersistence } from "../persistence";
import type { Board } from "../types";
import { useBoard } from "./useBoard";

export function useSaveBoard() {
  const { filePath } = useKanbanState();
  const { setStatus } = useSaveStatus();
  const { loadFromPath } = useBoard();

  const persistBoard = useCallback(
    // False means the disk version was reloaded; callers must discard their edit.
    async (board: Board): Promise<boolean> => {
      if (!filePath) throw new Error("No file is currently open.");
      setStatus((previous) => ({ pending: previous.pending + 1 }));
      try {
        try {
          await invoke("save_current_board", {
            path: filePath,
            board,
            force: false,
          });
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
            await invoke("save_current_board", {
              path: filePath,
              board,
              force: true,
            });
            return true;
          } else if (filePath) {
            await loadFromPath(filePath);
          }
          return false;
        }
        return true;
      } catch (error) {
        setStatus((previous) => ({ ...previous, error: String(error) }));
        throw error;
      } finally {
        setStatus((previous) => ({
          ...previous,
          pending: previous.pending - 1,
        }));
      }
    },
    [filePath, loadFromPath, setStatus],
  );

  const saveBoard = useCallback(
    (board: Board) => trackPersistence(persistBoard(board)),
    [persistBoard],
  );
  return { saveBoard };
}
