// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushSeed, makeWrapper, makeSeedBoard } from "./testUtils";
import { useAddTask } from "./useAddTask";

const mockInvoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));

describe("useAddTask", () => {
  const seedBoard = makeSeedBoard();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
    vi.spyOn(Date, "now").mockReturnValue(99999);
  });

  it("addTask is a no-op when text is empty", async () => {
    const { result } = renderHook(() => useAddTask(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    await act(async () => {
      await result.current.addTask("Todo");
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("addTask is a no-op when text contains only tokens (no plain text)", async () => {
    const { result } = renderHook(() => useAddTask(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    act(() => {
      result.current.setNewTaskText((prev) => ({ ...prev, Todo: "#label @2025-01-01" }));
    });
    await act(async () => {
      await result.current.addTask("Todo");
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("addTask calls invoke with the new task appended to the board", async () => {
    const { result } = renderHook(() => useAddTask(), { wrapper: makeWrapper(seedBoard) });
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
            id: "99999",
            text: "Buy milk",
            status: "todo",
            column: "Todo",
            labels: [],
          }),
        ]),
      }),
    });
  });

  it("addTask parses labels and due_date from the input", async () => {
    const { result } = renderHook(() => useAddTask(), { wrapper: makeWrapper(seedBoard) });
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
    });
  });

  it("addTask assigns done status for the last column", async () => {
    const { result } = renderHook(() => useAddTask(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    act(() => {
      result.current.setNewTaskText((prev) => ({ ...prev, Done: "Finished item" }));
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
    });
  });

  it("addTask clears newTaskText for the column after adding", async () => {
    const { result } = renderHook(() => useAddTask(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    act(() => {
      result.current.setNewTaskText((prev) => ({ ...prev, Todo: "Buy milk" }));
    });
    await act(async () => {
      await result.current.addTask("Todo");
    });

    expect(result.current.newTaskText["Todo"]).toBe("");
  });

  it("setNewTaskText updates text for the given column", () => {
    const { result } = renderHook(() => useAddTask(), { wrapper: makeWrapper(seedBoard) });

    act(() => {
      result.current.setNewTaskText((prev) => ({ ...prev, Todo: "hello" }));
    });

    expect(result.current.newTaskText["Todo"]).toBe("hello");
  });

  it("setNewTaskText preserves text for other columns", () => {
    const { result } = renderHook(() => useAddTask(), { wrapper: makeWrapper(seedBoard) });

    act(() => {
      result.current.setNewTaskText((prev) => ({ ...prev, Todo: "hello", Done: "bye" }));
    });
    act(() => {
      result.current.setNewTaskText((prev) => ({ ...prev, Todo: "updated" }));
    });

    expect(result.current.newTaskText["Done"]).toBe("bye");
  });
});
