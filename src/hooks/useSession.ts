import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef } from "react";
import { useKanbanDispatch, useKanbanState } from "../context/BoardContext";
import type { OpenDocument } from "../context/kanbanReducer";
import type { Board } from "../types";

interface BackendSessionState {
  open_paths: string[];
  active_path: string | null;
}

/**
 * Restores the tabs that were open the last time the app ran (from the local
 * `session.toml` file) on mount, and keeps that file up to date whenever
 * tabs are opened, closed, or switched, so the same tabs come back next time.
 */
export function useSession() {
  const { documents, filePath } = useKanbanState();
  const dispatch = useKanbanDispatch();
  const restoredRef = useRef(false);

  // Restore previously open tabs once, on mount.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      dispatch({ type: "LOAD_START" });
      const session = await invoke<BackendSessionState>("load_session");
      const restored: OpenDocument[] = [];
      for (const path of session.open_paths) {
        try {
          const board = await invoke<Board>("load_file", { path });
          restored.push({ filePath: path, board });
        } catch {
          // The file may have been moved or deleted since the last run;
          // skip that tab rather than blocking the rest of the restore.
        }
      }
      if (cancelled) return;
      dispatch({
        type: "RESTORE_SESSION",
        documents: restored,
        activeFilePath: session.active_path,
      });
      restoredRef.current = true;
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  // Persist the open tabs whenever they change, once the initial restore
  // has completed (so we don't overwrite the file with an empty session
  // while still loading it).
  useEffect(() => {
    if (!restoredRef.current) return;
    invoke("save_session", {
      openPaths: documents.map((d) => d.filePath),
      activePath: filePath,
    }).catch(() => {
      // Best-effort persistence; failing to save the session should not
      // interrupt the user's workflow.
    });
  }, [documents, filePath]);
}
