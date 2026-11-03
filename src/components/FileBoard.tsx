import { useEffect } from "react";
import styles from "./FileBoard.module.css";
import { KanbanColumn } from "./KanbanColumn";
import { useKanbanState, useSaveStatus } from "../context/BoardContext";
import { useColumns } from "../hooks/useColumns";
import { fileName } from "../fileNames";

export function FileBoard({
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
