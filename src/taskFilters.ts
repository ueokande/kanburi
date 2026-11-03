import type { Task } from "./types";
import { taskMatchesQuery } from "./utils";

export type DueFilter = "any" | "overdue" | "today" | "week" | "none";
export interface TaskFilters {
  query: string;
  label: string;
  due: DueFilter;
}
export const emptyTaskFilters: TaskFilters = {
  query: "",
  label: "",
  due: "any",
};

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function taskMatchesFilters(
  task: Task,
  filters: TaskFilters,
  now = new Date(),
): boolean {
  if (!taskMatchesQuery(task, filters.query)) return false;
  if (filters.label && !task.labels.includes(filters.label)) return false;
  const today = localDate(now);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6);
  switch (filters.due) {
    case "overdue":
      return !!task.due_date && task.due_date < today;
    case "today":
      return task.due_date === today;
    case "week":
      return (
        !!task.due_date &&
        task.due_date >= today &&
        task.due_date <= localDate(end)
      );
    case "none":
      return !task.due_date;
    default:
      return true;
  }
}

export function activeFilterCount(filters: TaskFilters): number {
  return (
    Number(!!filters.query.trim()) +
    Number(!!filters.label) +
    Number(filters.due !== "any")
  );
}
