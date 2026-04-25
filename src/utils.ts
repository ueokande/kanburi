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

export function isOverdue(due_date?: string): boolean {
  if (!due_date) return false;
  return new Date(due_date) < new Date(new Date().toDateString());
}
