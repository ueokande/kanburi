import { useEffect, useState } from "react";
import styles from "./FileBoard.module.css";
import { KanbanColumn } from "./KanbanColumn";
import { useKanbanState, useSaveStatus } from "../context/BoardContext";
import { useColumns } from "../hooks/useColumns";
import { fileName } from "../fileNames";
import { getAllLabels } from "../utils";
import { parseSearchQuery, taskMatchesFilters } from "../taskFilters";
import { BoardSearch } from "./BoardSearch";

export function FileBoard({
  onTitleChange,
}: {
  onTitleChange: (path: string, title: string | null | undefined) => void;
}) {
  const { board, filePath } = useKanbanState();
  const columns = useColumns();
  const { status } = useSaveStatus();
  const [query, setQuery] = useState("");
  const filters = parseSearchQuery(query);
  const filtering = !!query.trim();
  const visibleTasks = board.tasks.filter((task) =>
    taskMatchesFilters(task, filters),
  );
  const matchCount = visibleTasks.length;
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
        <BoardSearch
          query={query}
          onChange={setQuery}
          invalid={filters.errors.length > 0}
          labels={getAllLabels(board.tasks)}
        />
        <button
          type="button"
          className={styles.addColBtn}
          onClick={columns.addColumn}
        >
          + Add column
        </button>
      </header>
      {filtering && matchCount === 0 && (
        <p className={styles.noMatches}>No tasks match your filters.</p>
      )}
      {status.error && (
        <p className={styles.error} role="alert">
          Could not save: {status.error}. Your edit was not saved; please retry.
        </p>
      )}
      <div className={styles.board}>
        {board.columns.map((col) => (
          <KanbanColumn
            key={col.name}
            columnName={col.name}
            visibleTasks={visibleTasks}
            showTaskCount={!filtering}
          />
        ))}
      </div>
    </>
  );
}
