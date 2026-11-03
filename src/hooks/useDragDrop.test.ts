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

it("anchors a filtered drop before the next visible card while retaining hidden cards", async () => {
  const seed = makeSeedBoard();
  seed.tasks.push({ ...seed.tasks[1], id: "visible", text: "Visible task" });
  const { result } = renderHook(
    () => ({ drag: useDragDrop(), state: useKanbanState() }),
    { wrapper: makeWrapper(seed) },
  );
  await flushSeed();
  document.body.innerHTML =
    '<section><ul data-card-list><li data-task-id="t1">Source</li></ul></section><section id="filtered-target"><ul data-card-list><li data-task-id="visible">Visible task</li></ul></section>';
  const card = document.querySelector("li");
  const target = document.querySelector<HTMLElement>("#filtered-target");
  if (!card || !target) throw new Error("Missing test DOM");
  const start = {
    target: card,
    currentTarget: card,
    preventDefault: vi.fn(),
    dataTransfer: { setData: vi.fn() },
  } as unknown as DragEvent<HTMLLIElement>;
  const drop = {
    currentTarget: target,
    clientY: 0,
    preventDefault: vi.fn(),
  } as unknown as DragEvent<HTMLElement>;
  invoke.mockResolvedValue(undefined);
  result.current.drag.onDragStart("t1", start);
  result.current.drag.onDragOver(drop);
  await act(async () => {
    result.current.drag.onDrop(drop, "Done");
  });
  expect(result.current.state.board.tasks.map((task) => task.id)).toEqual([
    "t2",
    "t1",
    "visible",
  ]);
  expect(invoke).toHaveBeenCalledWith(
    "save_current_board",
    expect.objectContaining({
      board: expect.objectContaining({
        tasks: result.current.state.board.tasks,
      }),
    }),
  );
  result.current.drag.onDragEnd(start);
  document.body.innerHTML = "";
  vi.resetAllMocks();
});
