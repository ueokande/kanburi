import type { Status } from "./types";
import { LABEL_PALETTE } from "./types";

export function labelStyle(label: string) {
  const hash = [...label].reduce((a, c) => a + c.charCodeAt(0), 0);
  return LABEL_PALETTE[hash % LABEL_PALETTE.length];
}

/** Parse "Buy milk #Personal @2026-03-30" → { text, labels, due_date } */
export function parseTaskInput(raw: string): {
  text: string;
  labels: string[];
  due_date?: string;
} {
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

export function nextStatus(s: Status): Status {
  return s === "done" ? "todo" : "done";
}

/** Reorder tasks by moving `movedTask` into `targetColumn` at `insertIndex`. */
export function buildMovedTaskList(
  allTasks: import("./types").Task[],
  movedTask: import("./types").Task,
  targetColumn: string,
  insertIndex: number,
): import("./types").Task[] {
  const otherTasks = allTasks.filter((t) => t.id !== movedTask.id);
  const columnTasks = otherTasks.filter((t) => t.column === targetColumn);
  const clampedIdx = Math.max(0, Math.min(insertIndex, columnTasks.length));
  const insertBefore = columnTasks[clampedIdx] ?? null;

  const result: import("./types").Task[] = [];
  let inserted = false;
  for (const t of otherTasks) {
    if (!inserted && insertBefore !== null && t.id === insertBefore.id) {
      result.push(movedTask);
      inserted = true;
    }
    result.push(t);
  }
  if (!inserted) result.push(movedTask);
  return result;
}

export function formatDueDate(due_date: string): string {
  const d = new Date(due_date);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
export function isOverdue(due_date?: string): boolean {
  if (!due_date) return false;
  return new Date(due_date) < new Date(new Date().toDateString());
}
