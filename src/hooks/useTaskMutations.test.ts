// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushSeed, makeWrapper, makeSeedBoard } from "./testUtils";
import { useTaskMutations } from "./useTaskMutations";

const mockInvoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));

describe("useTaskMutations", () => {
  const seedBoard = makeSeedBoard();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
  });

  it("updateTask calls invoke with the patched board and dispatches UPDATE_TASK", async () => {
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await act(async () => {
      await result.current.updateTask("t1", { text: "Updated text" });
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({ id: "t1", text: "Updated text" }),
        ]),
      }),
    });
  });

  it("deleteTask calls invoke with the task removed", async () => {
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await act(async () => {
      await result.current.deleteTask("t1");
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: expect.objectContaining({
        tasks: [expect.objectContaining({ id: "t2" })],
      }),
    });
  });

  it("addLabel is a no-op for an empty string", async () => {
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await act(async () => {
      await result.current.addLabel("t1", "");
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("addLabel strips a leading # from the label", async () => {
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await act(async () => {
      await result.current.addLabel("t1", "#Feature");
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({ id: "t1", labels: ["Feature"] }),
        ]),
      }),
    });
  });

  it("addLabel is a no-op for a duplicate label", async () => {
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    // t2 already has label "Bug"
    await act(async () => {
      await result.current.addLabel("t2", "Bug");
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("addLabel appends the new label to the task", async () => {
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await act(async () => {
      await result.current.addLabel("t2", "Feature");
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({ id: "t2", labels: ["Bug", "Feature"] }),
        ]),
      }),
    });
  });

  it("removeLabel calls invoke with the label removed from the task", async () => {
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await act(async () => {
      await result.current.removeLabel("t2", "Bug");
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({ id: "t2", labels: [] }),
        ]),
      }),
    });
  });

  it("moveTask updates the task's column and status when moving cross-column", async () => {
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await act(async () => {
      await result.current.moveTask("t1", "Done", 0);
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({ id: "t1", column: "Done", status: "done" }),
        ]),
      }),
    });
  });

  it("moveTask keeps status when reordering within the same column", async () => {
    // Seed a board with two tasks in Todo so we can reorder
    const board = {
      columns: [{ name: "Todo" }, { name: "Done" }],
      tasks: [
        {
          id: "t1",
          text: "A",
          status: "todo" as const,
          column: "Todo",
          labels: [],
        },
        {
          id: "t2",
          text: "B",
          status: "todo" as const,
          column: "Todo",
          labels: [],
        },
      ],
    };
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(board),
    });
    await flushSeed();

    await act(async () => {
      await result.current.moveTask("t1", "Todo", 1);
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({ id: "t1", status: "todo" }),
        ]),
      }),
    });
  });

  it("sortColumnByDueDate calls invoke with tasks sorted ascending by due date", async () => {
    const board = {
      columns: [{ name: "Todo" }],
      tasks: [
        {
          id: "t1",
          text: "A",
          status: "todo" as const,
          column: "Todo",
          labels: [],
          due_date: "2025-03-01",
        },
        {
          id: "t2",
          text: "B",
          status: "todo" as const,
          column: "Todo",
          labels: [],
          due_date: "2025-01-01",
        },
        {
          id: "t3",
          text: "C",
          status: "todo" as const,
          column: "Todo",
          labels: [],
        },
      ],
    };
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(board),
    });
    await flushSeed();

    await act(async () => {
      await result.current.sortColumnByDueDate("Todo");
    });

    const savedBoard = mockInvoke.mock.calls[0][1].board as typeof board;
    expect(savedBoard.tasks.map((t) => t.id)).toEqual(["t2", "t1", "t3"]);
  });
});
