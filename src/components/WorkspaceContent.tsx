import { BoardProvider } from "../context/BoardContext";
import { fileName } from "../fileNames";
import type { WorkspaceController } from "../hooks/useWorkspace";
import { FileBoard } from "./FileBoard";
import { WelcomeScreen } from "./WelcomeScreen";
import styles from "./WorkspaceContent.module.css";

export function WorkspaceContent({
  workspace,
}: {
  workspace: WorkspaceController;
}) {
  return (
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
  );
}
