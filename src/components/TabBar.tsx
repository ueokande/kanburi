import type { OpenDocument } from "../context/kanbanReducer";
import styles from "./TabBar.module.css";

interface Props {
  documents: OpenDocument[];
  activeFilePath: string | null;
  onSwitch: (path: string) => void;
  onClose: (path: string) => void;
}

function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function TabBar({
  documents,
  activeFilePath,
  onSwitch,
  onClose,
}: Props) {
  if (documents.length === 0) return null;

  return (
    <div className={styles.tabBar} role="tablist" aria-label="Open files">
      {documents.map((doc) => {
        const isActive = doc.filePath === activeFilePath;
        return (
          <div
            key={doc.filePath}
            role="tab"
            tabIndex={0}
            aria-selected={isActive}
            title={doc.filePath}
            className={`${styles.tab} ${isActive ? styles.active : ""}`}
            onClick={() => onSwitch(doc.filePath)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSwitch(doc.filePath);
              }
            }}
          >
            <span className={styles.tabLabel}>{fileNameOf(doc.filePath)}</span>
            <button
              type="button"
              className={styles.closeBtn}
              aria-label={`Close ${fileNameOf(doc.filePath)}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(doc.filePath);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
