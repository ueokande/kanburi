// @vitest-environment happy-dom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLabelPopover } from "./useLabelPopover";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function setup(rect: { top: number; bottom: number; left: number }) {
  const input = document.createElement("input");
  const panel = document.createElement("div");
  Object.defineProperty(panel, "scrollHeight", { value: 180 });
  const geometry = vi
    .spyOn(input, "getBoundingClientRect")
    .mockImplementation(() => ({ ...rect, right: rect.left + 100 }) as DOMRect);
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(400);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(300);
  const anchor = { current: input };
  const { result, rerender } = renderHook(
    ({ open }) => useLabelPopover(anchor, open, 5),
    { initialProps: { open: false } },
  );
  (result.current.panelRef as { current: HTMLDivElement | null }).current =
    panel;
  rerender({ open: true });
  return { result, rerender, geometry };
}

describe("label suggestion placement", () => {
  it("opens below when there is room and clamps to the right window edge", () => {
    const { result } = setup({ top: 20, bottom: 40, left: 350 });
    expect(result.current.position).toMatchObject({
      top: 44,
      left: 132,
      width: 260,
      visibility: "visible",
    });
  });

  it("opens above when the input is near the bottom", () => {
    const { result } = setup({ top: 250, bottom: 270, left: 20 });
    expect(result.current.position).toMatchObject({ top: 66, left: 20 });
  });

  it("follows scroll and resize and removes event listeners on close", () => {
    const { result, rerender, geometry } = setup({
      top: 20,
      bottom: 40,
      left: 20,
    });
    geometry.mockReturnValue({ top: 50, bottom: 70, left: 30 } as DOMRect);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(result.current.position).toMatchObject({ top: 74, left: 30 });
    geometry.mockReturnValue({ top: 60, bottom: 80, left: 40 } as DOMRect);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current.position).toMatchObject({ top: 84, left: 40 });
    rerender({ open: false });
    geometry.mockClear();
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    expect(geometry).not.toHaveBeenCalled();
  });
});
