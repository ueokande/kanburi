// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushSeed, makeWrapper, makeSeedBoard } from "./testUtils";
import { useColumns } from "./useColumns";

const mockInvoke = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));

describe("useColumns", () => {
  const seedBoard = makeSeedBoard();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(undefined);
  });

  it("addColumn calls invoke with the new column appended and dispatches ADD_COLUMN", async () => {
    const { result } = renderHook(() => useColumns(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    await act(async () => {
      await result.current.addColumn();
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: expect.objectContaining({
        columns: [{ name: "Todo" }, { name: "Done" }, { name: "Column 3" }],
      }),
    });
  });

  it("commitRename is a no-op when editingName is blank", async () => {
    const { result } = renderHook(() => useColumns(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    act(() => {
      result.current.setEditingName("");
    });
    await act(async () => {
      result.current.commitRename("Todo");
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("commitRename is a no-op when editingName equals the old column name", async () => {
    const { result } = renderHook(() => useColumns(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    act(() => {
      result.current.startRename("Todo");
    });
    // editingName is now "Todo" — same as oldName
    await act(async () => {
      result.current.commitRename("Todo");
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("commitRename is a no-op when editingName is a duplicate column name", async () => {
    const { result } = renderHook(() => useColumns(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    act(() => {
      result.current.setEditingName("Done"); // already exists
    });
    await act(async () => {
      result.current.commitRename("Todo");
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("commitRename calls invoke with renamed column and updated task columns", async () => {
    const { result } = renderHook(() => useColumns(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    act(() => {
      result.current.setEditingName("Backlog");
    });
    await act(async () => {
      result.current.commitRename("Todo");
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: {
        columns: [{ name: "Backlog" }, { name: "Done" }],
        tasks: [
          expect.objectContaining({ id: "t1", column: "Backlog" }),
          expect.objectContaining({ id: "t2", column: "Done" }),
        ],
      },
    });
  });

  it("commitRename clears editingColumn after success", async () => {
    const { result } = renderHook(() => useColumns(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    act(() => {
      result.current.startRename("Todo");
    });
    act(() => {
      result.current.setEditingName("Backlog");
    });
    await act(async () => {
      result.current.commitRename("Todo");
    });

    expect(result.current.editingColumn).toBeNull();
  });

  it("deleteColumn calls invoke with the column and its tasks removed", async () => {
    const { result } = renderHook(() => useColumns(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    await act(async () => {
      await result.current.deleteColumn("Todo");
    });

    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: {
        columns: [{ name: "Done" }],
        tasks: [expect.objectContaining({ id: "t2" })],
      },
    });
  });

  it("startRename sets editingColumn and editingName", async () => {
    const { result } = renderHook(() => useColumns(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    act(() => {
      result.current.startRename("Todo");
    });

    expect(result.current.editingColumn).toBe("Todo");
    expect(result.current.editingName).toBe("Todo");
  });

  it("cancelRename clears editingColumn", async () => {
    const { result } = renderHook(() => useColumns(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    act(() => {
      result.current.startRename("Todo");
    });
    act(() => {
      result.current.cancelRename();
    });

    expect(result.current.editingColumn).toBeNull();
  });

  it("setEditingName updates editingName without changing editingColumn", async () => {
    const { result } = renderHook(() => useColumns(), { wrapper: makeWrapper(seedBoard) });
    await flushSeed();

    act(() => {
      result.current.startRename("Todo");
    });
    act(() => {
      result.current.setEditingName("Backlog");
    });

    expect(result.current.editingName).toBe("Backlog");
    expect(result.current.editingColumn).toBe("Todo");
  });
});
