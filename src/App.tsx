import styles from "./App.module.css";
import { KanbanColumn } from "./components/KanbanColumn";
import { useBoard } from "./hooks/useBoard";

function App() {
  const { board, tasks, columns, dnd } = useBoard();

  return (
    <div className={styles.app}>
      <header className={styles.appHeader}>
        <h1>KanbanMD</h1>
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
          <KanbanColumn
            key={col.name}
            column={col}
            tasks={board.tasks.filter((t) => t.column === col.name)}
            isEditing={columns.editingColumn === col.name}
            editingName={columns.editingName}
            onEditingNameChange={columns.setEditingName}
            onStartRename={() => columns.startRename(col.name)}
            onCommitRename={() => columns.commitRename(col.name)}
            onCancelRename={columns.cancelRename}
            renameInputRef={columns.renameInputRef}
            onDeleteColumn={() => columns.deleteColumn(col.name)}
            newTaskText={tasks.newTaskText[col.name] ?? ""}
            onNewTaskTextChange={(v) =>
              tasks.setNewTaskText((p) => ({ ...p, [col.name]: v }))
            }
            onAddTask={() => tasks.addTask(col.name)}
            expandedId={tasks.expandedId}
            onToggleExpand={tasks.toggleExpand}
            onUpdateTask={tasks.updateTask}
            onDeleteTask={tasks.deleteTask}
            onAddLabel={tasks.addLabel}
            onRemoveLabel={tasks.removeLabel}
            labelInput={tasks.labelInput}
            onLabelInputChange={(taskId, v) =>
              tasks.setLabelInput((p) => ({ ...p, [taskId]: v }))
            }
            onDragStart={dnd.onDragStart}
            onDrop={() => dnd.onDrop(col.name)}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
