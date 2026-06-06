import { invoke } from "@tauri-apps/api/core";
import { useKanbanDispatch, useKanbanState, useUIDispatch, useUIState } from "../context/BoardContext";
import { statusForColumn } from "./useBoard";
import type { Board, Task } from "../types";
import { parseTaskInput } from "../utils";

export function useAddTask() {
  const { board } = useKanbanState();
  const { newTaskText } = useUIState();
  const kanbanDispatch = useKanbanDispatch();
  const uiDispatch = useUIDispatch();
  const colNames = board.columns.map((c) => c.name);
  const getStatus = (colName: string) => statusForColumn(colNames, colName);

  function setNewTaskText(updater: (prev: Record<string, string>) => Record<string, string>) {
    const next = updater(newTaskText);
    for (const col of Object.keys(next)) {
      if (next[col] !== newTaskText[col]) {
        uiDispatch({ type: "SET_NEW_TASK_TEXT", column: col, text: next[col] });
      }
    }
  }

  async function addTask(column: string) {
    const raw = newTaskText[column] ?? "";
    if (!raw.trim()) return;
    const { text, labels, due_date } = parseTaskInput(raw);
    if (!text) return;
    const task: Task = {
      id: Date.now().toString(),
      text,
      status: getStatus(column),
      column,
      labels,
      due_date,
    };
    const updated: Board = { ...board, tasks: [...board.tasks, task] };
    await invoke("save_current_board", { board: updated });
    kanbanDispatch({ type: "ADD_TASK", task });
    uiDispatch({ type: "SET_NEW_TASK_TEXT", column, text: "" });
  }

  return { newTaskText, setNewTaskText, addTask };
}
