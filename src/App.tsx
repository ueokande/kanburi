import { useState } from "react";
import styles from "./App.module.css";
import { KanbanColumn } from "./components/KanbanColumn";
import { TabBar } from "./components/TabBar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { useKanbanState } from "./context/BoardContext";
import { useBoard } from "./hooks/useBoard";
import { useColumns } from "./hooks/useColumns";
import {
  forgetScrollPositions,
  useScrollPosition,
} from "./hooks/useScrollPosition";
import { useSession } from "./hooks/useSession";

function App() {
  const { board, filePath, isLoading } = useKanbanState();
  const { openFile, loadFromPath, documents, switchTab, closeTab } = useBoard();
  const columns = useColumns();
  const [loadError, setLoadError] = useState<string | undefined>();
  useSession();
  const boardScroll = useScrollPosition(filePath);

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

  const handleCloseTab = async (path: string) => {
    setLoadError(undefined);
    try {
      await closeTab(path);
    } catch (e) {
      setLoadError(String(e));
    } finally {
      forgetScrollPositions(path);
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

      <TabBar
        documents={documents}
        activeFilePath={filePath}
        onSwitch={switchTab}
        onClose={handleCloseTab}
      />

      <div
        className={styles.board}
        ref={boardScroll.ref}
        onScroll={boardScroll.onScroll}
      >
        {board.columns.map((col) => (
          <KanbanColumn key={col.name} columnName={col.name} />
        ))}
      </div>
    </div>
  );
}

export default App;
