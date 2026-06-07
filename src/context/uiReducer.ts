export interface UIState {
  expandedId: string | null;
  editingColumn: string | null;
  editingName: string;
  newTaskText: Record<string, string>;
}

export const initialUIState: UIState = {
  expandedId: null,
  editingColumn: null,
  editingName: "",
  newTaskText: {},
};

export type UIAction =
  | { type: "TOGGLE_EXPAND"; id: string }
  | { type: "CLEAR_EXPAND_IF_MATCH"; id: string }
  | { type: "START_RENAME_COLUMN"; name: string }
  | { type: "SET_EDITING_NAME"; name: string }
  | { type: "CANCEL_RENAME_COLUMN" }
  | { type: "CLEAR_EDITING_COLUMN" }
  | { type: "SET_NEW_TASK_TEXT"; column: string; text: string };

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "TOGGLE_EXPAND":
      return {
        ...state,
        expandedId: state.expandedId === action.id ? null : action.id,
      };

    case "CLEAR_EXPAND_IF_MATCH":
      return {
        ...state,
        expandedId: state.expandedId === action.id ? null : state.expandedId,
      };

    case "START_RENAME_COLUMN":
      return { ...state, editingColumn: action.name, editingName: action.name };

    case "SET_EDITING_NAME":
      return { ...state, editingName: action.name };

    case "CANCEL_RENAME_COLUMN":
    case "CLEAR_EDITING_COLUMN":
      return { ...state, editingColumn: null, editingName: "" };

    case "SET_NEW_TASK_TEXT":
      return {
        ...state,
        newTaskText: { ...state.newTaskText, [action.column]: action.text },
      };

    default:
      return state;
  }
}
