export type Status = "todo" | "done";

export interface Task {
  id: string;
  text: string;
  status: Status;
  column: string;
  labels: string[];
  due_date?: string;
  description?: string;
}

export interface Column {
  name: string;
}

export interface Board {
  columns: Column[];
  tasks: Task[];
}

export const LABEL_PALETTE = [
  { bg: "#e8f4fd", text: "#0078d4" },
  { bg: "#fef3e8", text: "#c47a00" },
  { bg: "#e8fdf0", text: "#00893a" },
  { bg: "#f4e8fd", text: "#7800d4" },
  { bg: "#fde8e8", text: "#c00000" },
  { bg: "#fdf8e8", text: "#8a6800" },
];
