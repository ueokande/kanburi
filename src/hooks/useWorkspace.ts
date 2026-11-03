import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { flushPersistence, trackPersistence } from "../persistence";
import { open } from "@tauri-apps/plugin-dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Board } from "../types";

export interface WorkspaceSettings {
  restoreOnStartup: boolean;
  openFiles: string[];
  activeFile: string | null;
  sidebarCollapsed: boolean;
}
export interface FileTab {
  path: string;
  board: Board;
}
interface Workspace {
  tabs: FileTab[];
  activeFile: string | null;
  restoreOnStartup: boolean;
  sidebarCollapsed: boolean;
}
const emptyWorkspace: Workspace = {
  tabs: [],
  activeFile: null,
  restoreOnStartup: true,
  sidebarCollapsed: false,
};

export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const current = useRef(workspace);
  current.current = workspace;
  const [ready, setReady] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string>();
  const [settingsError, setSettingsError] = useState<string>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const writes = useRef(Promise.resolve());
  const opens = useRef(Promise.resolve());

  // biome-ignore lint/correctness/useExhaustiveDependencies: retry explicitly requests a fresh settings load.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      setLoadFailed(false);
      try {
        const settings = await invoke<WorkspaceSettings>("load_settings");
        const tabs: FileTab[] = [];
        const failures: string[] = [];
        if (settings.restoreOnStartup) {
          for (const file of settings.openFiles) {
            if (cancelled) return;
            try {
              const path = await invoke<string>("resolve_file_path", {
                path: file,
              });
              if (tabs.some((tab) => tab.path === path)) continue;
              const board = await invoke<Board>("load_file", { path });
              tabs.push({ path, board });
            } catch (e) {
              failures.push(`${file}: ${String(e)}`);
            }
          }
        }
        if (cancelled) return;
        setWorkspace({
          tabs,
          activeFile:
            tabs.find((tab) => tab.path === settings.activeFile)?.path ??
            tabs[0]?.path ??
            null,
          restoreOnStartup: settings.restoreOnStartup,
          sidebarCollapsed: settings.sidebarCollapsed,
        });
        setError(
          failures.length
            ? `Some files could not be restored:\n${failures.join("\n")}`
            : undefined,
        );
        setSettingsError(undefined);
        setReady(true);
      } catch (e) {
        if (!cancelled) {
          setSettingsError(`Could not load settings: ${String(e)}`);
          setLoadFailed(true);
        }
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, [retry]);

  useEffect(() => {
    if (!ready) return;
    const settings: WorkspaceSettings = {
      restoreOnStartup: workspace.restoreOnStartup,
      openFiles: workspace.tabs.map((tab) => tab.path),
      activeFile: workspace.activeFile,
      sidebarCollapsed: workspace.sidebarCollapsed,
    };
    // Keep disk writes ordered when tabs are switched or closed rapidly.
    const write = writes.current
      .catch(() => {})
      .then(() => invoke("save_settings", { settings }))
      .then(() => {});
    writes.current = write;
    void trackPersistence(write).then(
      () => setSettingsError(undefined),
      (e) => setSettingsError(`Could not save settings: ${String(e)}`),
    );
  }, [ready, workspace]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    const appWindow = getCurrentWindow();
    void appWindow
      .onCloseRequested(async (event) => {
        event.preventDefault();
        try {
          await flushPersistence();
          await appWindow.destroy();
        } catch (e) {
          setError(`Could not finish saving before closing: ${String(e)}`);
        }
      })
      .then((stop) => {
        if (cancelled) stop();
        else unlisten = stop;
      })
      .catch((e) =>
        setError(`Could not register the close handler: ${String(e)}`),
      );
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const loadPaths = useCallback((paths: string[]) => {
    setIsOpening(true);
    const operation = opens.current.then(async () => {
      const failures: string[] = [];
      const opened = new Set(current.current.tabs.map((tab) => tab.path));
      for (const file of paths) {
        try {
          const path = await invoke<string>("resolve_file_path", {
            path: file,
          });
          if (opened.has(path)) {
            setWorkspace((previous) => ({
              ...previous,
              activeFile: previous.tabs.some((tab) => tab.path === path)
                ? path
                : previous.activeFile,
            }));
            continue;
          }
          const board = await invoke<Board>("load_file", { path });
          opened.add(path);
          setWorkspace((previous) => ({
            ...previous,
            tabs: previous.tabs.some((tab) => tab.path === path)
              ? previous.tabs
              : [...previous.tabs, { path, board }],
            activeFile: path,
          }));
        } catch (e) {
          failures.push(`${file}: ${String(e)}`);
        }
      }
      setError(failures.length ? failures.join("\n") : undefined);
    });
    opens.current = operation.catch((e) => setError(String(e)));
    void opens.current.then(() => setIsOpening(false));
    return opens.current;
  }, []);

  const openFiles = useCallback(async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });
      if (selected)
        await loadPaths(typeof selected === "string" ? [selected] : selected);
    } catch (e) {
      setError(String(e));
    }
  }, [loadPaths]);

  function closeFile(path: string) {
    setWorkspace((previous) => {
      const index = previous.tabs.findIndex((tab) => tab.path === path);
      const tabs = previous.tabs.filter((tab) => tab.path !== path);
      return {
        ...previous,
        tabs,
        activeFile:
          previous.activeFile === path
            ? (tabs[Math.min(index, tabs.length - 1)]?.path ?? null)
            : previous.activeFile,
      };
    });
  }

  return {
    ...workspace,
    ready,
    isOpening,
    error,
    settingsError,
    loadFailed,
    openFiles,
    loadPaths,
    closeFile,
    selectFile: (path: string) =>
      setWorkspace((previous) => ({ ...previous, activeFile: path })),
    setRestoreOnStartup: (value: boolean) =>
      setWorkspace((previous) => ({ ...previous, restoreOnStartup: value })),
    toggleSidebar: () =>
      setWorkspace((previous) => ({
        ...previous,
        sidebarCollapsed: !previous.sidebarCollapsed,
      })),
    retrySettings: () => {
      if (ready) setWorkspace((previous) => ({ ...previous }));
      else setRetry((value) => value + 1);
    },
    resetSettings: () => {
      setWorkspace(emptyWorkspace);
      setLoadFailed(false);
      setReady(true);
    },
  };
}
