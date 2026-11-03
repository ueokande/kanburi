import { useRef, useState } from "react";
import type { useSidebarResize } from "../hooks/useSidebarResize";
import type { WorkspaceController } from "../hooks/useWorkspace";
import { AppIcon } from "./AppIcon";
import { WorkspaceIcon } from "./WorkspaceIcon";
import { FileTabs } from "./FileTabs";
import { SettingsDialog } from "./SettingsDialog";
import { SidebarResizeHandle } from "./SidebarResizeHandle";
import styles from "./Sidebar.module.css";

interface Props {
  workspace: Pick<
    WorkspaceController,
    | "sidebarCollapsed"
    | "tabs"
    | "activeFile"
    | "ready"
    | "isOpening"
    | "restoreOnStartup"
    | "openFiles"
    | "closeFile"
    | "selectFile"
    | "toggleSidebar"
    | "setRestoreOnStartup"
  >;
  resize: ReturnType<typeof useSidebarResize>;
}

export function Sidebar({ workspace, resize }: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const settingsButton = useRef<HTMLButtonElement>(null);
  function closeSettings() {
    setShowSettings(false);
    settingsButton.current?.focus();
  }
  return (
    <>
      <aside
        ref={resize.sidebarRef}
        className={`${styles.sidebar} ${workspace.sidebarCollapsed ? styles.collapsed : ""} ${resize.isResizing ? styles.resizing : ""}`}
        aria-label="Files"
      >
        <div className={styles.brand}>
          <span aria-hidden="true">
            <AppIcon />
          </span>
          {!workspace.sidebarCollapsed && "Kanburi"}
        </div>
        {!workspace.sidebarCollapsed && (
          <>
            <FileTabs
              tabs={workspace.tabs}
              activeFile={workspace.activeFile}
              onSelect={workspace.selectFile}
              onClose={workspace.closeFile}
            />
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
        <SidebarResizeHandle resize={resize} />
      </aside>
      {showSettings && (
        <SettingsDialog
          restoreOnStartup={workspace.restoreOnStartup}
          disabled={!workspace.ready}
          onRestoreChange={workspace.setRestoreOnStartup}
          onClose={closeSettings}
        />
      )}
    </>
  );
}
