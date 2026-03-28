import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

interface Task {
  id: string;
  text: string;
  done: boolean;
  description?: string;
  due_date?: string;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newText, setNewText] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    const loaded = await invoke<Task[]>("load_tasks");
    setTasks(loaded);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function saveTasks(updated: Task[]) {
    await invoke("save_tasks", { tasks: updated });
    setTasks(updated);
  }

  async function addTask() {
    const text = newText.trim();
    if (!text) return;
    const task: Task = { id: Date.now().toString(), text, done: false };
    await saveTasks([...tasks, task]);
    setNewText("");
  }

  async function toggleTask(id: string) {
    await saveTasks(
      tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  }

  async function updateTask(id: string, patch: Partial<Task>) {
    await saveTasks(tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function deleteTask(id: string) {
    if (expandedId === id) setExpandedId(null);
    await saveTasks(tasks.filter((t) => t.id !== id));
  }

  function isOverdue(due_date?: string) {
    if (!due_date) return false;
    return new Date(due_date) < new Date(new Date().toDateString());
  }

  return (
    <div className="container">
      <h1>KanbanMD</h1>

      <div className="add-task">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task…"
        />
        <button type="button" onClick={addTask}>
          Add
        </button>
      </div>

      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className={task.done ? "done" : ""}>
            <div className="task-row">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task.id)}
              />
              <span className="task-text">{task.text}</span>
              {task.due_date && (
                <span
                  className={`due-badge ${isOverdue(task.due_date) ? "overdue" : ""}`}
                >
                  {task.due_date}
                </span>
              )}
              <button
                type="button"
                className="expand-btn"
                aria-label={expandedId === task.id ? "Collapse" : "Expand"}
                onClick={() =>
                  setExpandedId(expandedId === task.id ? null : task.id)
                }
              >
                {expandedId === task.id ? "▲" : "▼"}
              </button>
              <button
                type="button"
                className="delete"
                onClick={() => deleteTask(task.id)}
              >
                ✕
              </button>
            </div>

            {expandedId === task.id && (
              <div className="task-details">
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
        {tasks.length === 0 && (
          <li className="empty">No tasks yet. Add one above!</li>
        )}
      </ul>
    </div>
  );
}

export default App;
