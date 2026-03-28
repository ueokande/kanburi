import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";

interface Task {
  id: string;
  text: string;
  done: boolean;
  column: string;
  description?: string;
  due_date?: string;
}

interface Column {
  name: string;
}

interface Board {
  columns: Column[];
  tasks: Task[];
}

function App() {
  const [board, setBoard] = useState<Board>({ columns: [], tasks: [] });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({});
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const dragTaskId = useRef<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const loadBoard = useCallback(async () => {
    const loaded = await invoke<Board>("load_board");
    setBoard(loaded);
  }, []);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  async function saveBoard(updated: Board) {
    await invoke("save_board", { board: updated });
    setBoard(updated);
  }

  // ── Tasks ────────────────────────────────────────────────────────────────

  async function addTask(column: string) {
    const text = (newTaskText[column] ?? "").trim();
    if (!text) return;
    const task: Task = { id: Date.now().toString(), text, done: false, column };
    await saveBoard({ ...board, tasks: [...board.tasks, task] });
    setNewTaskText((p) => ({ ...p, [column]: "" }));
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    await saveBoard({
      ...board,
      tasks: board.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    });
  }

  async function deleteTask(id: string) {
    if (expandedId === id) setExpandedId(null);
    await saveBoard({
      ...board,
      tasks: board.tasks.filter((t) => t.id !== id),
    });
  }

  // ── Columns ──────────────────────────────────────────────────────────────

  async function addColumn() {
    const name = `Column ${board.columns.length + 1}`;
    await saveBoard({ ...board, columns: [...board.columns, { name }] });
  }

  async function renameColumn(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    if (board.columns.some((c) => c.name === trimmed)) return;
    await saveBoard({
      columns: board.columns.map((c) =>
        c.name === oldName ? { name: trimmed } : c,
      ),
      tasks: board.tasks.map((t) =>
        t.column === oldName ? { ...t, column: trimmed } : t,
      ),
    });
  }

  async function deleteColumn(name: string) {
    await saveBoard({
      columns: board.columns.filter((c) => c.name !== name),
      tasks: board.tasks.filter((t) => t.column !== name),
    });
  }

  // ── Drag and drop ────────────────────────────────────────────────────────

  function onDragStart(taskId: string) {
    dragTaskId.current = taskId;
  }

  async function onDrop(targetColumn: string) {
    const id = dragTaskId.current;
    if (!id) return;
    dragTaskId.current = null;
    const task = board.tasks.find((t) => t.id === id);
    if (!task || task.column === targetColumn) return;
    await updateTask(id, { column: targetColumn });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  function isOverdue(due_date?: string) {
    if (!due_date) return false;
    return new Date(due_date) < new Date(new Date().toDateString());
  }

  function startRenameColumn(name: string) {
    setEditingColumn(name);
    setEditingColumnName(name);
    // Focus input on next tick after it mounts
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  function commitRename(oldName: string) {
    renameColumn(oldName, editingColumnName);
    setEditingColumn(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="app">
      <header className="app-header">
        <h1>KanbanMD</h1>
        <button type="button" className="add-col-btn" onClick={addColumn}>
          + Add column
        </button>
      </header>

      <div className="board">
        {board.columns.map((col) => {
          const colTasks = board.tasks.filter((t) => t.column === col.name);
          return (
            <section
              key={col.name}
              className="column"
              aria-label={col.name}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.name)}
            >
              {/* Column header */}
              <div className="column-header">
                {editingColumn === col.name ? (
                  <input
                    ref={renameInputRef}
                    className="column-name-input"
                    value={editingColumnName}
                    onChange={(e) => setEditingColumnName(e.target.value)}
                    onBlur={() => commitRename(col.name)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(col.name);
                      if (e.key === "Escape") setEditingColumn(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="column-name-btn"
                    onClick={() => startRenameColumn(col.name)}
                    title="Click to rename"
                  >
                    {col.name}
                    <span className="task-count">{colTasks.length}</span>
                  </button>
                )}
                <button
                  type="button"
                  className="delete-col-btn"
                  onClick={() => deleteColumn(col.name)}
                  aria-label={`Delete ${col.name} column`}
                >
                  ✕
                </button>
              </div>

              {/* Task cards */}
              <ul className="card-list">
                {colTasks.map((task) => (
                  <li
                    key={task.id}
                    className={`card ${task.done ? "done" : ""}`}
                    draggable
                    onDragStart={() => onDragStart(task.id)}
                  >
                    <div className="card-row">
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() =>
                          updateTask(task.id, { done: !task.done })
                        }
                      />
                      <span className="card-text">{task.text}</span>
                      <button
                        type="button"
                        className="expand-btn"
                        aria-label={
                          expandedId === task.id ? "Collapse" : "Expand"
                        }
                        onClick={() =>
                          setExpandedId(expandedId === task.id ? null : task.id)
                        }
                      >
                        {expandedId === task.id ? "▲" : "▼"}
                      </button>
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => deleteTask(task.id)}
                        aria-label="Delete task"
                      >
                        ✕
                      </button>
                    </div>

                    {task.due_date && (
                      <span
                        className={`due-badge ${isOverdue(task.due_date) ? "overdue" : ""}`}
                      >
                        {task.due_date}
                      </span>
                    )}

                    {expandedId === task.id && (
                      <div className="card-details">
                        <label>
                          Due date
                          <input
                            type="date"
                            value={task.due_date ?? ""}
                            onChange={(e) =>
                              updateTask(task.id, {
                                due_date: e.target.value || undefined,
                              })
                            }
                          />
                        </label>
                        <label>
                          Description
                          <textarea
                            rows={3}
                            value={task.description ?? ""}
                            placeholder="Add a description…"
                            onChange={(e) =>
                              updateTask(task.id, {
                                description: e.target.value || undefined,
                              })
                            }
                          />
                        </label>
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {/* Add task input */}
              <div className="add-task">
                <input
                  value={newTaskText[col.name] ?? ""}
                  onChange={(e) =>
                    setNewTaskText((p) => ({
                      ...p,
                      [col.name]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && addTask(col.name)}
                  placeholder="Add a task…"
                />
                <button type="button" onClick={() => addTask(col.name)}>
                  Add
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default App;
