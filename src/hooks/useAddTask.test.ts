// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSeed, makeSeedBoard, makeWrapper } from "./testUtils";
import { useAddTask } from "./useAddTask";

const mockInvoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ confirm: vi.fn() }));

describe("useAddTask", () => {
  const seedBoard = makeSeedBoard();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
    vi.spyOn(Date, "now").mockReturnValue(99999);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("addTask is a no-op when text is empty", async () => {
    const { result } = renderHook(() => useAddTask(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await act(async () => {
      await result.current.addTask("Todo");
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("addTask is a no-op when text contains only tokens (no plain text)", async () => {
    const { result } = renderHook(() => useAddTask(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    act(() => {
      result.current.setNewTaskText((prev) => ({
        ...prev,
        Todo: "#label @2025-01-01",
      }));
    });
    await act(async () => {
      await result.current.addTask("Todo");
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("addTask calls invoke with the new task appended to the board", async () => {
    const { result } = renderHook(() => useAddTask(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    act(() => {
      result.current.setNewTaskText((prev) => ({ ...prev, Todo: "Buy milk" }));
    });
    await act(async () => {
      await result.current.addTask("Todo");
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            text: "Buy milk",
            status: "todo",
            column: "Todo",
            labels: [],
          }),
        ]),
      }),
      path: "/test.md",
      force: false,
    });
  });

  it("uses different IDs for tasks created at the same clock time", async () => {
    const { result } = renderHook(() => useAddTask(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();
    act(() => {
      result.current.setNewTaskText((prev) => ({ ...prev, Todo: "First" }));
    });
    await act(async () => {
      await result.current.addTask("Todo");
    });
    act(() => {
      result.current.setNewTaskText((prev) => ({ ...prev, Todo: "Second" }));
    });
    await act(async () => {
      await result.current.addTask("Todo");
    });
    const tasks = mockInvoke.mock.calls[1][1].board.tasks;
    expect(tasks).toHaveLength(4);
    expect(tasks[2].id).not.toBe(tasks[3].id);
  });

  it("addTask parses labels and due_date from the input", async () => {
    const { result } = renderHook(() => useAddTask(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    act(() => {
      result.current.setNewTaskText((prev) => ({
        ...prev,
        Todo: "Buy milk #Personal @2025-06-01",
      }));
    });
    await act(async () => {
      await result.current.addTask("Todo");
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({
            text: "Buy milk",
            labels: ["Personal"],
            due_date: "2025-06-01",
          }),
        ]),
      }),
      path: "/test.md",
      force: false,
    });
  });

  it("addTask assigns done status for the last column", async () => {
    const { result } = renderHook(() => useAddTask(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    act(() => {
      result.current.setNewTaskText((prev) => ({
        ...prev,
        Done: "Finished item",
      }));
    });
    await act(async () => {
      await result.current.addTask("Done");
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: expect.objectContaining({
        tasks: expect.arrayContaining([
          expect.objectContaining({ column: "Done", status: "done" }),
        ]),
      }),
      path: "/test.md",
      force: false,
    });
  });

  it("addTask clears newTaskText for the column after adding", async () => {
    const { result } = renderHook(() => useAddTask(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    act(() => {
      result.current.setNewTaskText((prev) => ({ ...prev, Todo: "Buy milk" }));
    });
    await act(async () => {
      await result.current.addTask("Todo");
    });

    expect(result.current.newTaskText.Todo).toBe("");
  });

  it("setNewTaskText updates text for the given column", () => {
    const { result } = renderHook(() => useAddTask(), {
      wrapper: makeWrapper(seedBoard),
    });

    act(() => {
      result.current.setNewTaskText((prev) => ({ ...prev, Todo: "hello" }));
    });

    expect(result.current.newTaskText.Todo).toBe("hello");
  });

  it("setNewTaskText preserves text for other columns", () => {
    const { result } = renderHook(() => useAddTask(), {
      wrapper: makeWrapper(seedBoard),
    });

    act(() => {
      result.current.setNewTaskText((prev) => ({
        ...prev,
        Todo: "hello",
        Done: "bye",
      }));
    });
    act(() => {
      result.current.setNewTaskText((prev) => ({ ...prev, Todo: "updated" }));
    });

    expect(result.current.newTaskText.Done).toBe("bye");
  });
});
