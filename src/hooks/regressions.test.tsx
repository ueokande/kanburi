// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useKanbanState } from "../context/BoardContext";
import { flushSeed, makeSeedBoard, makeWrapper } from "./testUtils";
import { useBoard } from "./useBoard";
import { useColumns } from "./useColumns";
import { useAddTask } from "./useAddTask";
import { useTaskMutations } from "./useTaskMutations";

const { invoke, confirm } = vi.hoisted(() => ({
  invoke: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ confirm, open: vi.fn() }));

describe("file and mutation regressions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    invoke.mockResolvedValue(undefined);
  });

  it("allows another open attempt after a failed load and retains the old board", async () => {
    const seed = makeSeedBoard();
    const { result } = renderHook(() => useBoard(), {
      wrapper: makeWrapper(seed),
    });
    await flushSeed();
    invoke.mockRejectedValueOnce("Missing file");
    await act(async () => {
      await expect(result.current.loadFromPath("/missing.md")).rejects.toBe(
        "Missing file",
      );
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.board).toEqual(seed);
    expect(result.current.filePath).toBe("/test.md");
    invoke.mockResolvedValueOnce(seed);
    await act(async () => {
      await result.current.loadFromPath("/retry.md");
    });
    expect(result.current.filePath).toBe("/retry.md");
  });

  it.each([
    "update",
    "add",
    "column",
  ])("does not apply a stale %s after conflict reload", async (mutation) => {
    const reloaded = {
      columns: [{ name: "External" }],
      tasks: [
        {
          ...makeSeedBoard().tasks[0],
          column: "External",
          text: "External title",
        },
      ],
    };
    const { result } = renderHook(
      () => ({
        tasks: useTaskMutations(),
        add: useAddTask(),
        columns: useColumns(),
        state: useKanbanState(),
      }),
      { wrapper: makeWrapper(makeSeedBoard()) },
    );
    await flushSeed();
    act(() => {
      result.current.add.setNewTaskText(() => ({ Todo: "New task" }));
    });
    invoke.mockRejectedValueOnce("CONFLICT").mockResolvedValueOnce(reloaded);
    confirm.mockResolvedValueOnce(false);
    await act(async () => {
      if (mutation === "update")
        await result.current.tasks.updateTask("t1", { text: "Stale edit" });
      if (mutation === "add") await result.current.add.addTask("Todo");
      if (mutation === "column") await result.current.columns.addColumn();
    });
    expect(result.current.state.board).toEqual(reloaded);
  });

  it("applies the edit after choosing overwrite", async () => {
    const { result } = renderHook(
      () => ({ tasks: useTaskMutations(), state: useKanbanState() }),
      {
        wrapper: makeWrapper(makeSeedBoard()),
      },
    );
    await flushSeed();
    invoke.mockRejectedValueOnce("CONFLICT").mockResolvedValueOnce(undefined);
    confirm.mockResolvedValueOnce(true);
    await act(async () => {
      await result.current.tasks.updateTask("t1", { text: "New title" });
    });
    expect(result.current.state.board.tasks[0].text).toBe("New title");
  });

  it("clears loading when conflict reload fails", async () => {
    const { result } = renderHook(
      () => ({ tasks: useTaskMutations(), state: useKanbanState() }),
      {
        wrapper: makeWrapper(makeSeedBoard()),
      },
    );
    await flushSeed();
    invoke
      .mockRejectedValueOnce("CONFLICT")
      .mockRejectedValueOnce("Read error");
    confirm.mockResolvedValueOnce(false);
    await act(async () => {
      await expect(result.current.tasks.deleteTask("t1")).rejects.toBe(
        "Read error",
      );
    });
    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.board.tasks).toHaveLength(2);
  });

  it("generates a unique column name after deletion", async () => {
    const seed = {
      columns: [{ name: "Column 1" }, { name: "Column 3" }],
      tasks: [],
    };
    const { result } = renderHook(
      () => ({ columns: useColumns(), state: useKanbanState() }),
      {
        wrapper: makeWrapper(seed),
      },
    );
    await flushSeed();
    await act(async () => {
      await result.current.columns.addColumn();
    });
    expect(result.current.state.board.columns.map((c) => c.name)).toEqual([
      "Column 1",
      "Column 3",
      "Column 4",
    ]);
  });
});
