import { useEffect, useRef, useState } from "react";
import styles from "./FileBoard.module.css";
import { KanbanColumn } from "./KanbanColumn";
import { useKanbanState, useSaveStatus } from "../context/BoardContext";
import { useColumns } from "../hooks/useColumns";
import { fileName } from "../fileNames";
import { taskMatchesQuery } from "../utils";

export function FileBoard({
  onTitleChange,
}: {
  onTitleChange: (path: string, title: string | null | undefined) => void;
}) {
  const { board, filePath } = useKanbanState();
  const columns = useColumns();
  const { status } = useSaveStatus();
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const filtering = query.trim().length > 0;
  const matchCount = board.tasks.filter((task) =>
    taskMatchesQuery(task, query),
  ).length;
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
      {/* biome-ignore lint/a11y/useSemanticElements: Use a search form for compatibility with React 18 and older WebViews. */}
      <form
        className={styles.searchBar}
        role="search"
        aria-label="Board tasks"
        onSubmit={(event) => event.preventDefault()}
      >
        <input
          ref={searchRef}
          type="search"
          aria-label="Search tasks"
          placeholder="Search titles, descriptions, labels…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !event.nativeEvent.isComposing) {
              setQuery("");
              event.stopPropagation();
            }
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              searchRef.current?.focus();
            }}
          >
            Clear search
          </button>
        )}
        <span role="status" aria-live="polite">
          {filtering
            ? `${matchCount} of ${board.tasks.length} tasks`
            : `${board.tasks.length} tasks`}
        </span>
      </form>
      {filtering && matchCount === 0 && (
        <p className={styles.noMatches}>No tasks match your search.</p>
      )}
      {status.error && (
        <p className={styles.error} role="alert">
          Could not save: {status.error}. Your edit was not saved; please retry.
        </p>
      )}
      <div className={styles.board}>
        {board.columns.map((col) => (
          <KanbanColumn key={col.name} columnName={col.name} query={query} />
        ))}
      </div>
    </>
  );
}
