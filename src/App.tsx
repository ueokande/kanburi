import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import styles from "./App.module.css";
import { KanbanColumn } from "./components/KanbanColumn";
import { WorkspaceIcon } from "./components/WorkspaceIcon";
import { WelcomeScreen } from "./components/WelcomeScreen";
import {
  BoardProvider,
  useKanbanState,
  useSaveStatus,
} from "./context/BoardContext";
import { useColumns } from "./hooks/useColumns";
import { useWorkspace } from "./hooks/useWorkspace";

function fileName(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}
function directory(path: string) {
  return (
    path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"))) ||
    "/"
  );
}

function FileBoard({
  onTitleChange,
}: {
  onTitleChange: (path: string, title: string | null | undefined) => void;
}) {
  const { board, filePath } = useKanbanState();
  const columns = useColumns();
  const { status } = useSaveStatus();
  const title = board.title?.trim() || fileName(filePath ?? "");
  useEffect(() => {
    if (filePath) onTitleChange(filePath, board.title);
  }, [filePath, board.title, onTitleChange]);
  return (
    <>
      <header className={styles.appHeader}>
        <div className={styles.fileHeading}>
          <h1 title={title}>{title}</h1>
          <p title={filePath ?? ""}>{filePath}</p>
        </div>
        <span
          className={`${styles.saveStatus} ${status.error ? styles.saveFailed : status.pending ? styles.saving : ""}`}
          role="status"
        >
          {status.error ? "Save failed" : status.pending ? "Saving…" : "Saved"}
        </span>
        <button
          type="button"
          className={styles.addColBtn}
          onClick={columns.addColumn}
        >
          + Add column
        </button>
      </header>
      {status.error && (
        <p className={styles.error} role="alert">
          Could not save: {status.error}. Your edit was not saved; please retry.
        </p>
      )}
      <div className={styles.board}>
        {board.columns.map((col) => (
          <KanbanColumn key={col.name} columnName={col.name} />
        ))}
      </div>
    </>
  );
}

function App() {
  const workspace = useWorkspace();
  const [showSettings, setShowSettings] = useState(false);
  const tabButtons = useRef(new Map<string, HTMLButtonElement>());
  const settingsButton = useRef<HTMLButtonElement>(null);

  function navigateTabs(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next = index;
    if (event.key === "ArrowDown") next = (index + 1) % workspace.tabs.length;
    else if (event.key === "ArrowUp")
      next = (index - 1 + workspace.tabs.length) % workspace.tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = workspace.tabs.length - 1;
    else return;
    event.preventDefault();
    const path = workspace.tabs[next].path;
    workspace.selectFile(path);
    tabButtons.current.get(path)?.focus();
  }

  return (
    <div
      className={`${styles.app} ${workspace.sidebarCollapsed ? styles.collapsed : ""}`}
    >
      <aside className={styles.sidebar} aria-label="Files">
        <div className={styles.brand}>
          <span aria-hidden="true">
            <WorkspaceIcon name="board" />
          </span>
          {!workspace.sidebarCollapsed && "Kanburi"}
        </div>
        {!workspace.sidebarCollapsed && (
          <>
            <div
              role="tablist"
              aria-label="Open files"
              aria-orientation="vertical"
              className={styles.fileList}
            >
              {workspace.tabs.map((tab, index) => (
                <div
                  className={`${styles.fileRow} ${tab.path === workspace.activeFile ? styles.selected : ""}`}
                  key={tab.path}
                >
                  <button
                    type="button"
                    role="tab"
                    id={`file-tab-${index}`}
                    aria-controls={`file-panel-${index}`}
                    aria-selected={tab.path === workspace.activeFile}
                    tabIndex={tab.path === workspace.activeFile ? 0 : -1}
                    className={styles.fileTab}
                    title={`${tab.board.title?.trim() || fileName(tab.path)}\n${tab.path}`}
                    onClick={() => workspace.selectFile(tab.path)}
                    onKeyDown={(event) => navigateTabs(event, index)}
                    ref={(element) => {
                      if (element) tabButtons.current.set(tab.path, element);
                      else tabButtons.current.delete(tab.path);
                    }}
                  >
                    <WorkspaceIcon name="file" />
                    <span className={styles.fileLabel}>
                      <strong>
                        {tab.board.title?.trim() || fileName(tab.path)}
                      </strong>
                      <small>
                        {tab.board.title?.trim()
                          ? tab.path
                          : directory(tab.path)}
                      </small>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.closeFile}
                    aria-label={`Close ${tab.board.title?.trim() || fileName(tab.path)}`}
                    title={`Close ${tab.path}`}
                    onClick={() => workspace.closeFile(tab.path)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={styles.openFileBtn}
              onClick={workspace.openFiles}
              disabled={!workspace.ready || workspace.isOpening}
            >
              + {workspace.isOpening ? "Opening…" : "Open file"}
            </button>
          </>
        )}
        <footer className={styles.sidebarFooter}>
          <button
            ref={settingsButton}
            type="button"
            aria-label="Settings"
            onClick={() => setShowSettings(true)}
          >
            <WorkspaceIcon name="settings" />
            {!workspace.sidebarCollapsed && "Settings"}
          </button>
          <button
            type="button"
            aria-label={
              workspace.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            onClick={workspace.toggleSidebar}
          >
            {workspace.sidebarCollapsed ? "»" : "«"}
          </button>
        </footer>
      </aside>
      <main className={styles.main}>
        {workspace.error && (
          <p role="alert" className={styles.error}>
            {workspace.error}
          </p>
        )}
        {workspace.settingsError && (
          <div role="alert" className={styles.error}>
            {workspace.settingsError}{" "}
            <button type="button" onClick={workspace.retrySettings}>
              Retry
            </button>
            {workspace.loadFailed && (
              <button type="button" onClick={workspace.resetSettings}>
                Use default settings
              </button>
            )}
          </div>
        )}
        {!workspace.ready && (
          <p className={styles.loading} role="status">
            {workspace.loadFailed
              ? "Settings could not be loaded. Retry or use default settings to continue."
              : "Restoring workspace…"}
          </p>
        )}
        {workspace.ready && workspace.tabs.length === 0 && (
          <WelcomeScreen
            onOpenFile={workspace.openFiles}
            onLoadFromPath={(path) => {
              void workspace.loadPaths([path]);
            }}
            isLoading={workspace.isOpening}
          />
        )}
        {workspace.tabs.map((tab, index) => (
          <section
            key={tab.path}
            role="tabpanel"
            id={`file-panel-${index}`}
            aria-labelledby={
              workspace.sidebarCollapsed ? undefined : `file-tab-${index}`
            }
            aria-label={
              workspace.sidebarCollapsed
                ? tab.board.title?.trim() || fileName(tab.path)
                : undefined
            }
            hidden={tab.path !== workspace.activeFile}
            className={styles.panel}
          >
            <BoardProvider
              initialState={{
                board: tab.board,
                filePath: tab.path,
                isLoading: false,
              }}
            >
              <FileBoard onTitleChange={workspace.updateTitle} />
            </BoardProvider>
          </section>
        ))}
      </main>
      {showSettings && (
        <dialog
          open
          className={styles.settings}
          aria-labelledby="settings-title"
          ref={(dialog) => {
            if (dialog && !dialog.matches(":modal")) {
              dialog.close();
              dialog.showModal();
            }
          }}
          onCancel={() => {
            setShowSettings(false);
            settingsButton.current?.focus();
          }}
        >
          <h2 id="settings-title">Settings</h2>
          <label>
            <input
              type="checkbox"
              checked={workspace.restoreOnStartup}
              disabled={!workspace.ready}
              onChange={(event) =>
                workspace.setRestoreOnStartup(event.target.checked)
              }
            />{" "}
            Restore open files on startup
          </label>
          <p>
            Reopen your files and return to the selected tab next time. Board
            contents stay in your Markdown files.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowSettings(false);
              settingsButton.current?.focus();
            }}
          >
            Done
          </button>
        </dialog>
      )}
    </div>
  );
}

export default App;
