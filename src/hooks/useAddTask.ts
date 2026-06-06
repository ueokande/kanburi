import { useState } from "react";
import type { Board, Status, Task } from "../types";
import { parseTaskInput } from "../utils";

export function useAddTask(
  board: Board,
  saveBoard: (b: Board) => Promise<void>,
  statusForColumn: (colName: string) => Status,
) {
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({});

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

  return { newTaskText, setNewTaskText, addTask };
}
