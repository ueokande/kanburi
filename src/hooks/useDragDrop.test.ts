// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import type { DragEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKanbanState } from "../context/BoardContext";
import { flushSeed, makeSeedBoard, makeWrapper } from "./testUtils";
import { useDragDrop } from "./useDragDrop";

const { invoke, confirm } = vi.hoisted(() => ({
  invoke: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ confirm, open: vi.fn() }));

describe("drag between columns", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.resetAllMocks();
  });

  it.each([
    false,
    true,
  ])("can move the source's last card into an empty column (reload=%s)", async (reload) => {
    const seed = makeSeedBoard();
    seed.tasks = [seed.tasks[0]];
    const { result } = renderHook(
      () => ({ drag: useDragDrop(), state: useKanbanState() }),
      {
        wrapper: makeWrapper(seed),
      },
    );
    await flushSeed();
    document.body.innerHTML =
      '<section><ul data-card-list><li>Task</li></ul></section><section id="target"><ul data-card-list></ul></section>';
    const card = document.querySelector("li");
    const target = document.querySelector<HTMLElement>("#target");
    if (!card || !target) throw new Error("Missing test DOM");
    const start = {
      target: card,
      currentTarget: card,
      preventDefault: vi.fn(),
      dataTransfer: { setData: vi.fn() },
    } as unknown as DragEvent<HTMLLIElement>;
    const drop = {
      currentTarget: target,
      clientY: 100,
      preventDefault: vi.fn(),
    } as unknown as DragEvent<HTMLElement>;
    result.current.drag.onDragStart("t1", start);
    result.current.drag.onDragOver(drop);
    expect(target.querySelector(".drag-placeholder")).not.toBeNull();
    const reloaded = { columns: [{ name: "External" }], tasks: [] };
    if (reload) {
      invoke.mockRejectedValueOnce("CONFLICT").mockResolvedValueOnce(reloaded);
      confirm.mockResolvedValueOnce(false);
    } else {
      invoke.mockResolvedValue(undefined);
    }
    await act(async () => {
      result.current.drag.onDrop(drop, "Done");
    });
    if (reload) expect(result.current.state.board).toEqual(reloaded);
    else
      expect(result.current.state.board.tasks[0]).toMatchObject({
        column: "Done",
        status: "done",
      });
    result.current.drag.onDragEnd(start);
  });
});
