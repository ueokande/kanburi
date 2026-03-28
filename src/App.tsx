import styles from "./App.module.css";
import { KanbanColumn } from "./components/KanbanColumn";
import { useBoard } from "./hooks/useBoard";

function App() {
  const {
    board,
    expandedId,
    setExpandedId,
    newTaskText,
    setNewTaskText,
    editingColumn,
    editingColumnName,
    setEditingColumnName,
    labelInput,
    setLabelInput,
    renameInputRef,
    addTask,
    updateTask,
    deleteTask,
    addLabel,
    removeLabel,
    addColumn,
    startRenameColumn,
    commitRename,
    setEditingColumn,
    deleteColumn,
    onDragStart,
    onDrop,
  } = useBoard();

  return (
    <div className={styles.app}>
      <header className={styles.appHeader}>
        <h1>KanbanMD</h1>
        <button type="button" className={styles.addColBtn} onClick={addColumn}>
          + Add column
        </button>
      </header>

      <div className={styles.board}>
        {board.columns.map((col) => (
          <KanbanColumn
            key={col.name}
            column={col}
            tasks={board.tasks.filter((t) => t.column === col.name)}
            isEditing={editingColumn === col.name}
            editingName={editingColumnName}
            onEditingNameChange={setEditingColumnName}
            onStartRename={() => startRenameColumn(col.name)}
            onCommitRename={() => commitRename(col.name)}
            onCancelRename={() => setEditingColumn(null)}
            renameInputRef={renameInputRef}
            onDeleteColumn={() => deleteColumn(col.name)}
            newTaskText={newTaskText[col.name] ?? ""}
            onNewTaskTextChange={(v) =>
              setNewTaskText((p) => ({ ...p, [col.name]: v }))
            }
            onAddTask={() => addTask(col.name)}
            expandedId={expandedId}
            onToggleExpand={(id) =>
              setExpandedId(expandedId === id ? null : id)
            }
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAddLabel={addLabel}
            onRemoveLabel={removeLabel}
            labelInput={labelInput}
            onLabelInputChange={(taskId, v) =>
              setLabelInput((p) => ({ ...p, [taskId]: v }))
            }
            onDragStart={onDragStart}
            onDrop={() => onDrop(col.name)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
