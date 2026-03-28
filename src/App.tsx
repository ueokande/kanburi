import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Task {
  id: string;
  text: string;
  done: boolean;
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newText, setNewText] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    const loaded = await invoke<Task[]>("load_tasks");
    setTasks(loaded);
  }

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
      tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  async function deleteTask(id: string) {
    await saveTasks(tasks.filter((t) => t.id !== id));
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
        <button onClick={addTask}>Add</button>
      </div>

      <ul className="task-list">
        {tasks.map((task) => (
          <li key={task.id} className={task.done ? "done" : ""}>
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggleTask(task.id)}
            />
            <span>{task.text}</span>
            <button className="delete" onClick={() => deleteTask(task.id)}>
              ✕
            </button>
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
