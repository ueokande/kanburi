/**
 * Shared test utilities for hooks that depend on BoardContext.
 * All files importing this must be run in a DOM environment (happy-dom).
 */
import { act } from "@testing-library/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { BoardProvider, useKanbanDispatch } from "../context/BoardContext";
import type { Board } from "../types";

export const EMPTY_BOARD: Board = { columns: [], tasks: [] };

/** A component that seeds kanban state by dispatching LOAD_SUCCESS on mount. */
function SeedBoard({ board }: { board: Board }) {
  const dispatch = useKanbanDispatch();
  useEffect(() => {
    dispatch({ type: "LOAD_SUCCESS", board, filePath: "/test.md" });
  }, [board, dispatch]);
  return null;
}

/**
 * Returns a wrapper that provides BoardProvider with an optional initial board.
 * After `renderHook`, call `await flushSeed()` before asserting seeded state.
 */
export function makeWrapper(board?: Board) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <BoardProvider>
        {board && <SeedBoard board={board} />}
        {children}
      </BoardProvider>
    );
  };
}

/** Flush the SeedBoard useEffect so board state is populated before tests run. */
export async function flushSeed() {
  await act(async () => {});
}

/** A minimal board with two columns and two tasks for use in tests. */
export function makeSeedBoard(): Board {
  return {
    columns: [{ name: "Todo" }, { name: "Done" }],
    tasks: [
      { id: "t1", text: "Task 1", status: "todo", column: "Todo", labels: [] },
      { id: "t2", text: "Task 2", status: "done", column: "Done", labels: ["Bug"] },
    ],
  };
}
