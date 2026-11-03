// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushSeed, makeSeedBoard, makeWrapper } from "./testUtils";
import { useTaskMutations } from "./useTaskMutations";

const mockInvoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ confirm: vi.fn() }));

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
      path: "/test.md",
      force: false,
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
      path: "/test.md",
      force: false,
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
      path: "/test.md",
      force: false,
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
      path: "/test.md",
      force: false,
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
      path: "/test.md",
      force: false,
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
      path: "/test.md",
      force: false,
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
      path: "/test.md",
      force: false,
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

describe("label validation and card-scoped rename", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
  });

  it("renames only the selected card and preserves label order", async () => {
    const board = makeSeedBoard();
    board.tasks[0].labels = ["Bug", "Backend"];
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(board),
    });
    await flushSeed();
    await act(async () => {
      await result.current.renameLabel("t1", "Bug", "#Feature");
    });
    const saved = mockInvoke.mock.calls[0][1].board;
    expect(saved.tasks[0].labels).toEqual(["Feature", "Backend"]);
    expect(saved.tasks[1].labels).toEqual(["Bug"]);
  });

  it.each([
    "",
    "#",
    "two words",
    "two\twords",
    "two\u3000words",
  ])("rejects invalid labels at the mutation boundary: %s", async (value) => {
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(makeSeedBoard()),
    });
    await flushSeed();
    await act(async () => {
      await result.current.addLabel("t1", value);
      await result.current.renameLabel("t2", "Bug", value);
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("does not replace another label, rename a missing label, or save an unchanged name", async () => {
    const board = makeSeedBoard();
    board.tasks[0].labels = ["Bug", "Backend"];
    const { result } = renderHook(() => useTaskMutations(), {
      wrapper: makeWrapper(board),
    });
    await flushSeed();
    await act(async () => {
      await result.current.renameLabel("t1", "Bug", "Backend");
      await result.current.renameLabel("t1", "Missing", "Feature");
      await result.current.renameLabel("t1", "Bug", "Bug");
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
