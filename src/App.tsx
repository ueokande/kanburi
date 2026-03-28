import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";

type Status = "todo" | "in_progress" | "done";

interface Task {
  id: string;
  text: string;
  status: Status;
  column: string;
  labels: string[];
  due_date?: string;
  description?: string;
}

interface Column {
  name: string;
}

interface Board {
  columns: Column[];
  tasks: Task[];
}

const STATUS_CYCLE: Status[] = ["todo", "in_progress", "done"];
const STATUS_ICON: Record<Status, string> = {
  todo: "☐",
  in_progress: "◑",
  done: "☑",
};

const LABEL_PALETTE = [
  { bg: "#e8f4fd", text: "#0078d4" },
  { bg: "#fef3e8", text: "#c47a00" },
  { bg: "#e8fdf0", text: "#00893a" },
  { bg: "#f4e8fd", text: "#7800d4" },
  { bg: "#fde8e8", text: "#c00000" },
  { bg: "#fdf8e8", text: "#8a6800" },
];

function labelStyle(label: string) {
  const hash = [...label].reduce((a, c) => a + c.charCodeAt(0), 0);
  return LABEL_PALETTE[hash % LABEL_PALETTE.length];
}

/** Parse "Buy milk #Personal @2026-03-30" → { text, labels, due_date } */
function parseTaskInput(raw: string) {
  const labels: string[] = [];
  let due_date: string | undefined;
  const textParts: string[] = [];

  for (const token of raw.trim().split(/\s+/)) {
    if (token.startsWith("#") && token.length > 1) {
      labels.push(token.slice(1));
    } else if (token.startsWith("@") && token.length > 1) {
      due_date = token.slice(1);
    } else {
      textParts.push(token);
    }
  }
  return { text: textParts.join(" "), labels, due_date };
}

function nextStatus(s: Status): Status {
  return STATUS_CYCLE[(STATUS_CYCLE.indexOf(s) + 1) % STATUS_CYCLE.length];
}

function isOverdue(due_date?: string) {
  if (!due_date) return false;
  return new Date(due_date) < new Date(new Date().toDateString());
}

// ── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [board, setBoard] = useState<Board>({ columns: [], tasks: [] });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({});
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState("");
  const [labelInput, setLabelInput] = useState<Record<string, string>>({});
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

  function statusForColumn(colName: string): Status {
    const idx = board.columns.findIndex((c) => c.name === colName);
    const total = board.columns.length;
    if (idx === 0) return "todo";
    if (idx === total - 1) return "done";
    return "in_progress";
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────

  async function addTask(column: string) {
    const raw = newTaskText[column] ?? "";
    if (!raw.trim()) return;
    const { text, labels, due_date } = parseTaskInput(raw);
    if (!text) return;
    const task: Task = {
      id: Date.now().toString(),
      text,
      status: statusForColumn(column),
      column,
      labels,
      due_date,
    };
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

  async function addLabel(taskId: string) {
    const raw = (labelInput[taskId] ?? "").trim().replace(/^#/, "");
    if (!raw) return;
    const task = board.tasks.find((t) => t.id === taskId);
    if (!task || task.labels.includes(raw)) return;
    await updateTask(taskId, { labels: [...task.labels, raw] });
    setLabelInput((p) => ({ ...p, [taskId]: "" }));
  }

  async function removeLabel(taskId: string, label: string) {
    const task = board.tasks.find((t) => t.id === taskId);
    if (!task) return;
    await updateTask(taskId, {
      labels: task.labels.filter((l) => l !== label),
    });
  }

  // ── Columns ───────────────────────────────────────────────────────────────

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

  function startRenameColumn(name: string) {
    setEditingColumn(name);
    setEditingColumnName(name);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  function commitRename(oldName: string) {
    renameColumn(oldName, editingColumnName);
    setEditingColumn(null);
  }

  // ── Drag & drop ───────────────────────────────────────────────────────────

  function onDragStart(taskId: string) {
    dragTaskId.current = taskId;
  }

  async function onDrop(targetColumn: string) {
    const id = dragTaskId.current;
    if (!id) return;
    dragTaskId.current = null;
    const task = board.tasks.find((t) => t.id === id);
    if (!task || task.column === targetColumn) return;
    await updateTask(id, {
      column: targetColumn,
      status: statusForColumn(targetColumn),
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
                    className={`card ${task.status}`}
                    draggable
                    onDragStart={() => onDragStart(task.id)}
                  >
                    {/* Card main row */}
                    <div className="card-row">
                      <button
                        type="button"
                        className={`status-btn status-${task.status}`}
                        aria-label={`Status: ${task.status}. Click to advance.`}
                        onClick={() =>
                          updateTask(task.id, {
                            status: nextStatus(task.status),
                          })
                        }
                      >
                        {STATUS_ICON[task.status]}
                      </button>
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

                    {/* Labels + due badge row (shown when present) */}
                    {(task.labels.length > 0 || task.due_date) && (
                      <div className="card-meta">
                        {task.labels.map((label) => {
                          const { bg, text } = labelStyle(label);
                          return (
                            <span
                              key={label}
                              className="label-badge"
                              style={{ background: bg, color: text }}
                            >
                              #{label}
                            </span>
                          );
                        })}
                        {task.due_date && (
                          <span
                            className={`due-badge ${isOverdue(task.due_date) ? "overdue" : ""}`}
                          >
                            📅 {task.due_date}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Expanded details */}
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

                        <div className="label-editor">
                          <span className="label-editor-title">Labels</span>
                          <div className="label-list">
                            {task.labels.map((label) => {
                              const { bg, text } = labelStyle(label);
                              return (
                                <span
                                  key={label}
                                  className="label-badge editable"
                                  style={{ background: bg, color: text }}
                                >
                                  #{label}
                                  <button
                                    type="button"
                                    aria-label={`Remove label ${label}`}
                                    onClick={() => removeLabel(task.id, label)}
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                          <div className="label-input-row">
                            <input
                              value={labelInput[task.id] ?? ""}
                              placeholder="#NewLabel"
                              onChange={(e) =>
                                setLabelInput((p) => ({
                                  ...p,
                                  [task.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && addLabel(task.id)
                              }
                            />
                            <button
                              type="button"
                              onClick={() => addLabel(task.id)}
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        <label>
                          Description
                          <textarea
                            rows={4}
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
                  placeholder="Add task… #Label @date"
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
