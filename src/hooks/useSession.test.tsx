// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoardProvider, useKanbanState } from "../context/BoardContext";
import { useBoard } from "./useBoard";
import { useSession } from "./useSession";

const mockInvoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));

const boardA = { columns: [{ name: "Todo" }], tasks: [] };
const boardB = { columns: [{ name: "Done" }], tasks: [] };

function Wrapper({ children }: { children: React.ReactNode }) {
  return <BoardProvider>{children}</BoardProvider>;
}

function useTestHarness() {
  useSession();
  const state = useKanbanState();
  const board = useBoard();
  return { ...state, ...board };
}

describe("useSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restores previously open tabs from load_session on mount", async () => {
    mockInvoke.mockImplementation(
      (cmd: string, args?: Record<string, unknown>) => {
        if (cmd === "load_session") {
          return Promise.resolve({
            open_paths: ["/a.md", "/b.md"],
            active_path: "/b.md",
          });
        }
        if (cmd === "load_file") {
          return Promise.resolve(args?.path === "/a.md" ? boardA : boardB);
        }
        return Promise.resolve(undefined);
      },
    );

    const { result } = renderHook(() => useTestHarness(), { wrapper: Wrapper });
    await act(async () => {});

    expect(result.current.documents).toEqual([
      { filePath: "/a.md", board: boardA },
      { filePath: "/b.md", board: boardB },
    ]);
    expect(result.current.filePath).toBe("/b.md");
    expect(mockInvoke).toHaveBeenCalledWith("load_session");
  });

  it("skips tabs whose file fails to load instead of blocking the rest", async () => {
    mockInvoke.mockImplementation(
      (cmd: string, args?: Record<string, unknown>) => {
        if (cmd === "load_session") {
          return Promise.resolve({
            open_paths: ["/missing.md", "/a.md"],
            active_path: "/a.md",
          });
        }
        if (cmd === "load_file") {
          if (args?.path === "/missing.md") return Promise.reject("ENOENT");
          return Promise.resolve(boardA);
        }
        return Promise.resolve(undefined);
      },
    );

    const { result } = renderHook(() => useTestHarness(), { wrapper: Wrapper });
    await act(async () => {});

    expect(result.current.documents).toEqual([
      { filePath: "/a.md", board: boardA },
    ]);
    expect(result.current.filePath).toBe("/a.md");
  });

  it("persists open tabs via save_session after a new tab is opened", async () => {
    mockInvoke.mockImplementation(
      (cmd: string, args?: Record<string, unknown>) => {
        if (cmd === "load_session") {
          return Promise.resolve({ open_paths: [], active_path: null });
        }
        if (cmd === "load_file") {
          return Promise.resolve(args?.path === "/a.md" ? boardA : boardB);
        }
        return Promise.resolve(undefined);
      },
    );

    const { result } = renderHook(() => useTestHarness(), { wrapper: Wrapper });
    await act(async () => {});
    mockInvoke.mockClear();

    await act(async () => {
      await result.current.loadFromPath("/a.md");
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_session", {
      openPaths: ["/a.md"],
      activePath: "/a.md",
    });
  });
});
