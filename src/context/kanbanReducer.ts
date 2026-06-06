import type { Board, Task } from "../types";
import { buildMovedTaskList } from "../utils";

export interface KanbanState {
  board: Board;
  filePath: string | null;
  isLoading: boolean;
}

export const initialKanbanState: KanbanState = {
  board: { columns: [], tasks: [] },
  filePath: null,
  isLoading: false,
};

export type KanbanAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; board: Board; filePath: string }
  | { type: "ADD_TASK"; task: Task }
  | { type: "UPDATE_TASK"; id: string; patch: Partial<Task> }
  | { type: "DELETE_TASK"; id: string }
  | { type: "MOVE_TASK"; id: string; targetColumn: string; insertIndex: number; statusForColumn: (col: string) => Task["status"] }
  | { type: "ADD_COLUMN"; name: string }
  | { type: "RENAME_COLUMN"; oldName: string; newName: string }
  | { type: "DELETE_COLUMN"; name: string }
  | { type: "SORT_COLUMN_BY_DUE_DATE"; column: string }
  | { type: "ADD_LABEL"; taskId: string; label: string }
  | { type: "REMOVE_LABEL"; taskId: string; label: string };

export function kanbanReducer(state: KanbanState, action: KanbanAction): KanbanState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, isLoading: true };

    case "LOAD_SUCCESS":
      return { board: action.board, filePath: action.filePath, isLoading: false };

    case "ADD_TASK":
      return { ...state, board: { ...state.board, tasks: [...state.board.tasks, action.task] } };

    case "UPDATE_TASK":
      return {
        ...state,
        board: {
          ...state.board,
          tasks: state.board.tasks.map((t) =>
            t.id === action.id ? { ...t, ...action.patch } : t,
          ),
        },
      };

    case "DELETE_TASK":
      return {
        ...state,
        board: { ...state.board, tasks: state.board.tasks.filter((t) => t.id !== action.id) },
      };

    case "MOVE_TASK": {
      const task = state.board.tasks.find((t) => t.id === action.id);
      if (!task) return state;
      const movedTask: Task =
        action.targetColumn === task.column
          ? { ...task }
          : { ...task, column: action.targetColumn, status: action.statusForColumn(action.targetColumn) };
      return {
        ...state,
        board: {
          ...state.board,
          tasks: buildMovedTaskList(state.board.tasks, movedTask, action.targetColumn, action.insertIndex),
        },
      };
    }

    case "ADD_COLUMN":
      return {
        ...state,
        board: { ...state.board, columns: [...state.board.columns, { name: action.name }] },
      };

    case "RENAME_COLUMN": {
      const { oldName, newName } = action;
      return {
        ...state,
        board: {
          columns: state.board.columns.map((c) => (c.name === oldName ? { name: newName } : c)),
          tasks: state.board.tasks.map((t) => (t.column === oldName ? { ...t, column: newName } : t)),
        },
      };
    }

    case "DELETE_COLUMN":
      return {
        ...state,
        board: {
          columns: state.board.columns.filter((c) => c.name !== action.name),
          tasks: state.board.tasks.filter((t) => t.column !== action.name),
        },
      };

    case "SORT_COLUMN_BY_DUE_DATE": {
      const others = state.board.tasks.filter((t) => t.column !== action.column);
      const columnTasks = state.board.tasks.filter((t) => t.column === action.column);
      const sorted = [...columnTasks].sort((a, b) => {
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });
      return { ...state, board: { ...state.board, tasks: [...others, ...sorted] } };
    }

    case "ADD_LABEL": {
      const task = state.board.tasks.find((t) => t.id === action.taskId);
      if (!task || task.labels.includes(action.label)) return state;
      return {
        ...state,
        board: {
          ...state.board,
          tasks: state.board.tasks.map((t) =>
            t.id === action.taskId ? { ...t, labels: [...t.labels, action.label] } : t,
          ),
        },
      };
    }

    case "REMOVE_LABEL":
      return {
        ...state,
        board: {
          ...state.board,
          tasks: state.board.tasks.map((t) =>
            t.id === action.taskId
              ? { ...t, labels: t.labels.filter((l) => l !== action.label) }
              : t,
          ),
        },
      };

    default:
      return state;
  }
}
