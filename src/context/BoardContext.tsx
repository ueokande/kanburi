import { createContext, useContext, useReducer } from "react";
import type { Dispatch, ReactNode } from "react";
import { kanbanReducer, initialKanbanState } from "./kanbanReducer";
import { uiReducer, initialUIState } from "./uiReducer";
import type { KanbanAction, KanbanState } from "./kanbanReducer";
import type { UIAction, UIState } from "./uiReducer";

const KanbanStateContext = createContext<KanbanState | null>(null);
const UIStateContext = createContext<UIState | null>(null);
const KanbanDispatchContext = createContext<Dispatch<KanbanAction> | null>(null);
const UIDispatchContext = createContext<Dispatch<UIAction> | null>(null);

export function BoardProvider({ children }: { children: ReactNode }) {
  const [kanbanState, kanbanDispatch] = useReducer(kanbanReducer, initialKanbanState);
  const [uiState, uiDispatch] = useReducer(uiReducer, initialUIState);
  return (
    <KanbanStateContext.Provider value={kanbanState}>
      <KanbanDispatchContext.Provider value={kanbanDispatch}>
        <UIStateContext.Provider value={uiState}>
          <UIDispatchContext.Provider value={uiDispatch}>
            {children}
          </UIDispatchContext.Provider>
        </UIStateContext.Provider>
      </KanbanDispatchContext.Provider>
    </KanbanStateContext.Provider>
  );
}

export function useKanbanState(): KanbanState {
  const ctx = useContext(KanbanStateContext);
  if (!ctx) throw new Error("useKanbanState must be used within BoardProvider");
  return ctx;
}

export function useUIState(): UIState {
  const ctx = useContext(UIStateContext);
  if (!ctx) throw new Error("useUIState must be used within BoardProvider");
  return ctx;
}

export function useKanbanDispatch(): Dispatch<KanbanAction> {
  const ctx = useContext(KanbanDispatchContext);
  if (!ctx) throw new Error("useKanbanDispatch must be used within BoardProvider");
  return ctx;
}

export function useUIDispatch(): Dispatch<UIAction> {
  const ctx = useContext(UIDispatchContext);
  if (!ctx) throw new Error("useUIDispatch must be used within BoardProvider");
  return ctx;
}
