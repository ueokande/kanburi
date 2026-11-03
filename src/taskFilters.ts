import type { Task } from "./types";
import { taskMatchesQuery } from "./utils";

export interface SearchQuery {
  terms: string[];
  labels: string[];
  dueDates: string[];
  errors: string[];
}
export interface SearchCompletionOption {
  value: string;
  label: string;
  continue: boolean;
}
export interface SearchCompletion {
  start: number;
  end: number;
  kind: "Filters" | "Labels" | "Due date";
  options: SearchCompletionOption[];
}
export interface AppliedSearchCompletion {
  query: string;
  caret: number;
}

export const dueOptions = [
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "Next 7 days" },
  { value: "none", label: "No due date" },
];
export function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDate(date) === value;
}
export function parseSearchQuery(value: string): SearchQuery {
  const result: SearchQuery = {
    terms: [],
    labels: [],
    dueDates: [],
    errors: [],
  };
  for (const token of value.trim().split(/\s+/).filter(Boolean)) {
    if (token.startsWith("#")) {
      if (token.length > 1) result.labels.push(token.slice(1));
    } else if (token.toLowerCase().startsWith("due:")) {
      const due = token.slice(4).toLowerCase();
      if (dueOptions.some((option) => option.value === due) || validDate(due))
        result.dueDates.push(due);
      else result.errors.push(`Invalid deadline “${token}”.`);
    } else result.terms.push(token);
  }
  return result;
}
export function taskMatchesFilters(
  task: Task,
  filters: SearchQuery,
  now = new Date(),
): boolean {
  if (filters.errors.length) return false;
  if (!filters.terms.every((term) => taskMatchesQuery(task, term)))
    return false;
  if (!filters.labels.every((label) => task.labels.includes(label)))
    return false;
  const today = localDate(now);
  const day = (offset: number) =>
    localDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset),
    );
  return filters.dueDates.every((due) => {
    switch (due) {
      case "overdue":
        return !!task.due_date && task.due_date < today;
      case "today":
        return task.due_date === today;
      case "tomorrow":
        return task.due_date === day(1);
      case "week":
        return (
          !!task.due_date && task.due_date >= today && task.due_date <= day(6)
        );
      case "none":
        return !task.due_date;
      default:
        return task.due_date === due;
    }
  });
}

export function searchCompletion(
  value: string,
  caret: number,
  labels: string[],
  now = new Date(),
): SearchCompletion | null {
  const tokenStart = value.slice(0, caret).search(/\S+$/);
  const start = tokenStart < 0 ? caret : tokenStart;
  const tail = value.slice(caret).search(/\s/);
  const end = tokenStart < 0 ? caret : tail < 0 ? value.length : caret + tail;
  const prefix = value.slice(start, caret);
  if (prefix.startsWith("#"))
    return {
      start,
      end,
      kind: "Labels",
      options: labels
        .filter((label) =>
          label.toLowerCase().startsWith(prefix.slice(1).toLowerCase()),
        )
        .slice(0, 8)
        .map((label) => ({
          value: `#${label}`,
          label: `#${label}`,
          continue: false,
        })),
    };
  if (prefix.toLowerCase().startsWith("due:")) {
    const part = prefix.slice(4).toLowerCase();
    return {
      start,
      end,
      kind: "Due date",
      options: [
        ...dueOptions.map((option) => ({
          value: `due:${option.value}`,
          label: option.label,
          continue: false,
        })),
        {
          value: `due:${localDate(now)}`,
          label: `Exact date · ${localDate(now)}`,
          continue: false,
        },
      ].filter((option) => option.value.slice(4).startsWith(part)),
    };
  }
  const options = [
    { value: "#", label: "Label", continue: true },
    { value: "due:", label: "Due date", continue: true },
  ].filter((option) => option.value.startsWith(prefix.toLowerCase()));
  return options.length ? { start, end, kind: "Filters", options } : null;
}

export function applySearchCompletion(
  query: string,
  completion: SearchCompletion,
  option: SearchCompletionOption,
): AppliedSearchCompletion {
  const suffix = query.slice(completion.end);
  const separator = option.continue || /^\s/.test(suffix) ? "" : " ";
  const nextTokenOffset = option.continue ? 0 : 1;
  return {
    query: query.slice(0, completion.start) + option.value + separator + suffix,
    caret: completion.start + option.value.length + nextTokenOffset,
  };
}
