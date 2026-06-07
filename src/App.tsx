import { useState } from "react";
import styles from "./App.module.css";
import { KanbanColumn } from "./components/KanbanColumn";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { useKanbanState } from "./context/BoardContext";
import { useBoard } from "./hooks/useBoard";
import { useColumns } from "./hooks/useColumns";

function App() {
  const { board, filePath, isLoading } = useKanbanState();
  const { openFile, loadFromPath } = useBoard();
  const columns = useColumns();
  const [loadError, setLoadError] = useState<string | undefined>();

  const handleOpenFile = async () => {
    setLoadError(undefined);
    try {
      await openFile();
    } catch (e) {
      setLoadError(String(e));
    }
  };

  const handleLoadFromPath = async (path: string) => {
    setLoadError(undefined);
    try {
      await loadFromPath(path);
    } catch (e) {
      setLoadError(String(e));
    }
  };

  if (!filePath) {
    return (
      <WelcomeScreen
        onOpenFile={handleOpenFile}
        onLoadFromPath={handleLoadFromPath}
        isLoading={isLoading}
        error={loadError}
      />
    );
  }

  const fileName = filePath.split(/[\\/]/).pop() ?? filePath;

  return (
    <div className={styles.app}>
      <header className={styles.appHeader}>
        <h1>Kanburi</h1>
        <span className={styles.fileName} title={filePath}>
          {fileName}
        </span>
        <button
          type="button"
          className={styles.openFileBtn}
          onClick={handleOpenFile}
          disabled={isLoading}
        >
          Open…
        </button>
        <button
          type="button"
          className={styles.addColBtn}
          onClick={columns.addColumn}
        >
          + Add column
        </button>
      </header>

      <div className={styles.board}>
        {board.columns.map((col) => (
          <KanbanColumn key={col.name} columnName={col.name} />
        ))}
      </div>
    </div>
  );
}

export default App;
