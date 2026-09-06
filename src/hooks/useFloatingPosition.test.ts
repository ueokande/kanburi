// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFloatingPosition } from "./useFloatingPosition";

describe("useFloatingPosition", () => {
  it("starts at { top: 0, left: 0 }", () => {
    const { result } = renderHook(() => useFloatingPosition());
    expect(result.current.position).toEqual({ top: 0, left: 0 });
  });

  it("update() is a no-op when the anchor isn't mounted", () => {
    const { result } = renderHook(() => useFloatingPosition());
    act(() => result.current.update());
    expect(result.current.position).toEqual({ top: 0, left: 0 });
  });

  it("update() positions the popover below and left-aligned with the anchor", () => {
    const { result } = renderHook(() => useFloatingPosition<HTMLDivElement>());

    const anchor = document.createElement("div");
    document.body.appendChild(anchor);
    anchor.getBoundingClientRect = () =>
      ({ top: 10, bottom: 30, left: 20, right: 100 }) as DOMRect;
    // Simulate the ref being attached to the anchor element.
    (result.current.anchorRef as { current: HTMLDivElement | null }).current =
      anchor;

    act(() => result.current.update());

    expect(result.current.position).toEqual({ top: 34, left: 20 });
    document.body.removeChild(anchor);
  });

  it("applies a custom offset", () => {
    const { result } = renderHook(() =>
      useFloatingPosition<HTMLDivElement>(10),
    );

    const anchor = document.createElement("div");
    anchor.getBoundingClientRect = () =>
      ({ top: 0, bottom: 50, left: 5, right: 60 }) as DOMRect;
    (result.current.anchorRef as { current: HTMLDivElement | null }).current =
      anchor;

    act(() => result.current.update());

    expect(result.current.position).toEqual({ top: 60, left: 5 });
  });
});
