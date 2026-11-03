import type { Dispatch, ReactNode } from "react";
import { createContext, useContext, useReducer, useState } from "react";
import type { KanbanAction, KanbanState } from "./kanbanReducer";
import { initialKanbanState, kanbanReducer } from "./kanbanReducer";
import type { UIAction, UIState } from "./uiReducer";
import { initialUIState, uiReducer } from "./uiReducer";

interface SaveStatus {
  pending: number;
  error?: string;
}
const SaveStatusContext = createContext<{
  status: SaveStatus;
  setStatus: Dispatch<import("react").SetStateAction<SaveStatus>>;
} | null>(null);

export function useSaveStatus() {
  const context = useContext(SaveStatusContext);
  if (!context)
    throw new Error("useSaveStatus must be used within BoardProvider");
  return context;
}

const KanbanStateContext = createContext<KanbanState | null>(null);
const UIStateContext = createContext<UIState | null>(null);
const KanbanDispatchContext = createContext<Dispatch<KanbanAction> | null>(
  null,
);
const UIDispatchContext = createContext<Dispatch<UIAction> | null>(null);

export function BoardProvider({
  children,
  initialState = initialKanbanState,
}: {
  children: ReactNode;
  initialState?: KanbanState;
}) {
  const [kanbanState, kanbanDispatch] = useReducer(kanbanReducer, initialState);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ pending: 0 });
  const [uiState, uiDispatch] = useReducer(uiReducer, initialUIState);
  return (
    <KanbanStateContext.Provider value={kanbanState}>
      <KanbanDispatchContext.Provider value={kanbanDispatch}>
        <UIStateContext.Provider value={uiState}>
          <UIDispatchContext.Provider value={uiDispatch}>
            <SaveStatusContext.Provider
              value={{ status: saveStatus, setStatus: setSaveStatus }}
            >
              {children}
            </SaveStatusContext.Provider>
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
  if (!ctx)
    throw new Error("useKanbanDispatch must be used within BoardProvider");
  return ctx;
}

export function useUIDispatch(): Dispatch<UIAction> {
  const ctx = useContext(UIDispatchContext);
  if (!ctx) throw new Error("useUIDispatch must be used within BoardProvider");
  return ctx;
}
