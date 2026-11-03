import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { fileName, directory } from "../fileNames";
import type { FileTab } from "../hooks/useWorkspace";
import { WorkspaceIcon } from "./WorkspaceIcon";
import styles from "./Sidebar.module.css";

interface Props {
  tabs: FileTab[];
  activeFile: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

export function FileTabs({ tabs, activeFile, onSelect, onClose }: Props) {
  const tabButtons = useRef(new Map<string, HTMLButtonElement>());
  function navigateTabs(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next = index;
    if (event.key === "ArrowDown") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowUp")
      next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    const path = tabs[next].path;
    onSelect(path);
    tabButtons.current.get(path)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Open files"
      aria-orientation="vertical"
      className={styles.fileList}
    >
      {tabs.map((tab, index) => (
        <div
          className={`${styles.fileRow} ${tab.path === activeFile ? styles.selected : ""}`}
          key={tab.path}
        >
          <button
            type="button"
            role="tab"
            id={`file-tab-${index}`}
            aria-controls={`file-panel-${index}`}
            aria-selected={tab.path === activeFile}
            tabIndex={tab.path === activeFile ? 0 : -1}
            className={styles.fileTab}
            title={`${tab.board.title?.trim() || fileName(tab.path)}\n${tab.path}`}
            onClick={() => onSelect(tab.path)}
            onKeyDown={(event) => navigateTabs(event, index)}
            ref={(element) => {
              if (element) tabButtons.current.set(tab.path, element);
              else tabButtons.current.delete(tab.path);
            }}
          >
            <WorkspaceIcon name="file" />
            <span className={styles.fileLabel}>
              <strong>{tab.board.title?.trim() || fileName(tab.path)}</strong>
              <small>
                {tab.board.title?.trim() ? tab.path : directory(tab.path)}
              </small>
            </span>
          </button>
          <button
            type="button"
            className={styles.closeFile}
            aria-label={`Close ${tab.board.title?.trim() || fileName(tab.path)}`}
            title={`Close ${tab.path}`}
            onClick={() => onClose(tab.path)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
