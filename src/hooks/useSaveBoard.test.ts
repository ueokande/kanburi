// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushSeed, makeSeedBoard, makeWrapper } from "./testUtils";
import { useSaveBoard } from "./useSaveBoard";

const mockInvoke = vi.hoisted(() => vi.fn());
const mockConfirm = vi.hoisted(() => vi.fn());
vi.mock("@tauri-apps/api/core", () => ({ invoke: mockInvoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ confirm: mockConfirm }));

const seedBoard = makeSeedBoard();

describe("useSaveBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saveBoard calls invoke with the board and force: false on success", async () => {
    mockInvoke.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSaveBoard(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await act(async () => {
      await result.current.saveBoard(seedBoard);
    });

    expect(mockInvoke).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: seedBoard,
      force: false,
    });
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it("shows a confirm dialog when the backend returns CONFLICT", async () => {
    mockInvoke.mockRejectedValueOnce("CONFLICT");
    mockConfirm.mockResolvedValue(true); // user chooses Overwrite
    mockInvoke.mockResolvedValueOnce(undefined); // force save succeeds

    const { result } = renderHook(() => useSaveBoard(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await act(async () => {
      await result.current.saveBoard(seedBoard);
    });

    expect(mockConfirm).toHaveBeenCalledOnce();
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining("modified"),
      expect.objectContaining({ okLabel: "Overwrite", cancelLabel: "Reload" }),
    );
  });

  it("on CONFLICT + Overwrite: re-invokes save with force: true", async () => {
    mockInvoke.mockRejectedValueOnce("CONFLICT");
    mockConfirm.mockResolvedValue(true);
    mockInvoke.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useSaveBoard(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await act(async () => {
      await result.current.saveBoard(seedBoard);
    });

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "save_current_board", {
      board: seedBoard,
      force: true,
    });
  });

  it("on CONFLICT + Reload: invokes load_file and dispatches LOAD_SUCCESS", async () => {
    const reloadedBoard = {
      columns: [{ name: "Todo" }],
      tasks: [],
    };
    mockInvoke.mockRejectedValueOnce("CONFLICT");
    mockConfirm.mockResolvedValue(false); // user chooses Reload
    mockInvoke.mockResolvedValueOnce(reloadedBoard); // load_file returns new board

    const { result } = renderHook(() => useSaveBoard(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await act(async () => {
      await result.current.saveBoard(seedBoard);
    });

    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "load_file", {
      path: "/test.md",
    });
  });

  it("on CONFLICT + Reload: does nothing when no file is open", async () => {
    mockInvoke.mockRejectedValueOnce("CONFLICT");
    mockConfirm.mockResolvedValue(false); // user chooses Reload

    // No seed board → filePath is null
    const { result } = renderHook(() => useSaveBoard(), {
      wrapper: makeWrapper(),
    });

    await act(async () => {
      await result.current.saveBoard(seedBoard);
    });

    // Only the initial failing call, no reload attempt
    expect(mockInvoke).toHaveBeenCalledOnce();
    expect(mockInvoke).toHaveBeenCalledWith("save_current_board", {
      board: seedBoard,
      force: false,
    });
  });

  it("re-throws non-CONFLICT errors", async () => {
    const networkError = new Error("Network error");
    mockInvoke.mockRejectedValueOnce(networkError);

    const { result } = renderHook(() => useSaveBoard(), {
      wrapper: makeWrapper(seedBoard),
    });
    await flushSeed();

    await expect(
      act(async () => {
        await result.current.saveBoard(seedBoard);
      }),
    ).rejects.toThrow("Network error");

    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
