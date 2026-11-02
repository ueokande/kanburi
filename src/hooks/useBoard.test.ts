// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeWrapper } from "./testUtils";
import { useBoard } from "./useBoard";

const mockInvoke = vi.hoisted(() => vi.fn());
const mockOpen = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: mockOpen }));

const mockBoard = {
  columns: [{ name: "Todo" }, { name: "Done" }],
  tasks: [
    {
      id: "t1",
      text: "Task 1",
      status: "todo" as const,
      column: "Todo",
      labels: [],
    },
  ],
};

describe("useBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(mockBoard); // default: load_file returns mockBoard
  });

  it("starts with an empty board and no file", () => {
    const { result } = renderHook(() => useBoard(), { wrapper: makeWrapper() });
    expect(result.current.board).toEqual({ columns: [], tasks: [] });
    expect(result.current.filePath).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("loadFromPath calls invoke('load_file') with the given path", async () => {
    const { result } = renderHook(() => useBoard(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.loadFromPath("/test.md");
    });

    expect(mockInvoke).toHaveBeenCalledWith("load_file", { path: "/test.md" });
  });

  it("loadFromPath updates board and filePath in state after loading", async () => {
    const { result } = renderHook(() => useBoard(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.loadFromPath("/test.md");
    });

    expect(result.current.board).toEqual(mockBoard);
    expect(result.current.filePath).toBe("/test.md");
    expect(result.current.isLoading).toBe(false);
  });

  it("openFile does not load when the dialog is cancelled", async () => {
    mockOpen.mockResolvedValue(null); // user cancelled
    const { result } = renderHook(() => useBoard(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.openFile();
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.current.board).toEqual({ columns: [], tasks: [] });
  });

  it("openFile loads the file when a path is selected", async () => {
    mockOpen.mockResolvedValue("/chosen.md");
    const { result } = renderHook(() => useBoard(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.openFile();
    });

    expect(mockInvoke).toHaveBeenCalledWith("load_file", {
      path: "/chosen.md",
    });
    expect(result.current.filePath).toBe("/chosen.md");
  });

  it("loadFromPath adds a new tab to documents", async () => {
    const { result } = renderHook(() => useBoard(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.loadFromPath("/test.md");
    });

    expect(result.current.documents).toEqual([
      { filePath: "/test.md", board: mockBoard },
    ]);
  });

  it("loadFromPath switches to an already-open tab instead of reloading it", async () => {
    const { result } = renderHook(() => useBoard(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.loadFromPath("/a.md");
    });
    await act(async () => {
      await result.current.loadFromPath("/b.md");
    });
    mockInvoke.mockClear();

    await act(async () => {
      await result.current.loadFromPath("/a.md");
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.current.filePath).toBe("/a.md");
    expect(result.current.documents).toHaveLength(2);
  });

  it("switchTab changes the active document without invoking the backend", async () => {
    const { result } = renderHook(() => useBoard(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.loadFromPath("/a.md");
    });
    await act(async () => {
      await result.current.loadFromPath("/b.md");
    });
    mockInvoke.mockClear();

    act(() => {
      result.current.switchTab("/a.md");
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(result.current.filePath).toBe("/a.md");
  });

  it("closeTab invokes close_file and removes the document", async () => {
    const { result } = renderHook(() => useBoard(), { wrapper: makeWrapper() });

    await act(async () => {
      await result.current.loadFromPath("/a.md");
    });
    await act(async () => {
      await result.current.loadFromPath("/b.md");
    });

    await act(async () => {
      await result.current.closeTab("/b.md");
    });

    expect(mockInvoke).toHaveBeenCalledWith("close_file", { path: "/b.md" });
    expect(result.current.documents).toEqual([
      { filePath: "/a.md", board: mockBoard },
    ]);
    expect(result.current.filePath).toBe("/a.md");
  });
});
