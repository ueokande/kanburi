import type { Board, Task } from "../types";
import { buildMovedTaskList } from "../utils";

const EMPTY_BOARD: Board = { columns: [], tasks: [] };

/** A single open tab: a file path paired with its in-memory board. */
export interface OpenDocument {
  filePath: string;
  board: Board;
}

/**
 * `board`/`filePath` always mirror the currently active tab (or the empty
 * board / `null` when no tabs are open), so existing consumers that only
 * care about "the current board" don't need to change. `documents` holds
 * every open tab so the UI can render a tab bar and switch between them.
 */
export interface KanbanState {
  board: Board;
  filePath: string | null;
  isLoading: boolean;
  documents: OpenDocument[];
}

export const initialKanbanState: KanbanState = {
  board: EMPTY_BOARD,
  filePath: null,
  isLoading: false,
  documents: [],
};

export type KanbanAction =
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; board: Board; filePath: string }
  | { type: "SWITCH_TAB"; filePath: string }
  | { type: "CLOSE_TAB"; filePath: string }
  | {
      type: "RESTORE_SESSION";
      documents: OpenDocument[];
      activeFilePath: string | null;
    }
  | { type: "ADD_TASK"; task: Task }
  | { type: "UPDATE_TASK"; id: string; patch: Partial<Task> }
  | { type: "DELETE_TASK"; id: string }
  | {
      type: "MOVE_TASK";
      id: string;
      targetColumn: string;
      insertIndex: number;
      statusForColumn: (col: string) => Task["status"];
    }
  | { type: "ADD_COLUMN"; name: string }
  | { type: "RENAME_COLUMN"; oldName: string; newName: string }
  | { type: "DELETE_COLUMN"; name: string }
  | { type: "SORT_COLUMN_BY_DUE_DATE"; column: string }
  | { type: "ADD_LABEL"; taskId: string; label: string }
  | { type: "REMOVE_LABEL"; taskId: string; label: string };

export function kanbanReducer(
  state: KanbanState,
  action: KanbanAction,
): KanbanState {
  const next = kanbanReducerBase(state, action);
  return syncActiveDocument(next);
}

/**
 * Keeps `documents` in sync with the top-level `board`/`filePath` mirror
 * after any action that mutates the active board in place (add/update/move
 * task, rename column, etc.), so the tab the user is looking at is always
 * reflected in the open-tabs list.
 */
function syncActiveDocument(state: KanbanState): KanbanState {
  if (!state.filePath) return state;
  const idx = state.documents.findIndex((d) => d.filePath === state.filePath);
  if (idx === -1) return state;
  if (state.documents[idx].board === state.board) return state;
  const documents = [...state.documents];
  documents[idx] = { filePath: state.filePath, board: state.board };
  return { ...state, documents };
}

function upsertDocument(
  documents: OpenDocument[],
  doc: OpenDocument,
): OpenDocument[] {
  const idx = documents.findIndex((d) => d.filePath === doc.filePath);
  if (idx === -1) return [...documents, doc];
  const next = [...documents];
  next[idx] = doc;
  return next;
}

function kanbanReducerBase(
  state: KanbanState,
  action: KanbanAction,
): KanbanState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, isLoading: true };

    case "LOAD_SUCCESS":
      return {
        ...state,
        board: action.board,
        filePath: action.filePath,
        isLoading: false,
        documents: upsertDocument(state.documents, {
          filePath: action.filePath,
          board: action.board,
        }),
      };

    case "SWITCH_TAB": {
      const doc = state.documents.find((d) => d.filePath === action.filePath);
      if (!doc) return state;
      return { ...state, board: doc.board, filePath: doc.filePath };
    }

    case "CLOSE_TAB": {
      const documents = state.documents.filter(
        (d) => d.filePath !== action.filePath,
      );
      if (action.filePath !== state.filePath) {
        return { ...state, documents };
      }
      const nextDoc = documents[0];
      return {
        ...state,
        documents,
        board: nextDoc?.board ?? EMPTY_BOARD,
        filePath: nextDoc?.filePath ?? null,
      };
    }

    case "RESTORE_SESSION": {
      const active =
        (action.activeFilePath &&
          action.documents.find((d) => d.filePath === action.activeFilePath)) ||
        action.documents[0];
      return {
        ...state,
        documents: action.documents,
        board: active?.board ?? EMPTY_BOARD,
        filePath: active?.filePath ?? null,
        isLoading: false,
      };
    }

    case "ADD_TASK":
      return {
        ...state,
        board: { ...state.board, tasks: [...state.board.tasks, action.task] },
      };

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
        board: {
          ...state.board,
          tasks: state.board.tasks.filter((t) => t.id !== action.id),
        },
      };

    case "MOVE_TASK": {
      const task = state.board.tasks.find((t) => t.id === action.id);
      if (!task) return state;
      const movedTask: Task =
        action.targetColumn === task.column
          ? { ...task }
          : {
              ...task,
              column: action.targetColumn,
              status: action.statusForColumn(action.targetColumn),
            };
      return {
        ...state,
        board: {
          ...state.board,
          tasks: buildMovedTaskList(
            state.board.tasks,
            movedTask,
            action.targetColumn,
            action.insertIndex,
          ),
        },
      };
    }

    case "ADD_COLUMN":
      return {
        ...state,
        board: {
          ...state.board,
          columns: [...state.board.columns, { name: action.name }],
        },
      };

    case "RENAME_COLUMN": {
      const { oldName, newName } = action;
      return {
        ...state,
        board: {
          columns: state.board.columns.map((c) =>
            c.name === oldName ? { name: newName } : c,
          ),
          tasks: state.board.tasks.map((t) =>
            t.column === oldName ? { ...t, column: newName } : t,
          ),
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
      const others = state.board.tasks.filter(
        (t) => t.column !== action.column,
      );
      const columnTasks = state.board.tasks.filter(
        (t) => t.column === action.column,
      );
      const sorted = [...columnTasks].sort((a, b) => {
        if (a.due_date && b.due_date)
          return a.due_date.localeCompare(b.due_date);
        if (a.due_date) return -1;
        if (b.due_date) return 1;
        return 0;
      });
      return {
        ...state,
        board: { ...state.board, tasks: [...others, ...sorted] },
      };
    }

    case "ADD_LABEL": {
      const task = state.board.tasks.find((t) => t.id === action.taskId);
      if (!task || task.labels.includes(action.label)) return state;
      return {
        ...state,
        board: {
          ...state.board,
          tasks: state.board.tasks.map((t) =>
            t.id === action.taskId
              ? { ...t, labels: [...t.labels, action.label] }
              : t,
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
