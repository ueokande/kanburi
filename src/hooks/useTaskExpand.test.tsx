// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { BoardProvider } from "../context/BoardContext";
import { useTaskExpand } from "./useTaskExpand";

function wrapper({ children }: { children: ReactNode }) {
  return <BoardProvider>{children}</BoardProvider>;
}

describe("useTaskExpand", () => {
  it("starts with no expanded card", () => {
    const { result } = renderHook(() => useTaskExpand(), { wrapper });
    expect(result.current.expandedId).toBeNull();
  });

  it("toggleExpand expands a card", () => {
    const { result } = renderHook(() => useTaskExpand(), { wrapper });
    act(() => {
      result.current.toggleExpand("t1");
    });
    expect(result.current.expandedId).toBe("t1");
  });

  it("toggleExpand collapses a card when called again with the same id", () => {
    const { result } = renderHook(() => useTaskExpand(), { wrapper });
    act(() => {
      result.current.toggleExpand("t1");
    });
    act(() => {
      result.current.toggleExpand("t1");
    });
    expect(result.current.expandedId).toBeNull();
  });

  it("toggleExpand switches to a different card", () => {
    const { result } = renderHook(() => useTaskExpand(), { wrapper });
    act(() => {
      result.current.toggleExpand("t1");
    });
    act(() => {
      result.current.toggleExpand("t2");
    });
    expect(result.current.expandedId).toBe("t2");
  });

  it("clearIfMatch clears expandedId when it matches", () => {
    const { result } = renderHook(() => useTaskExpand(), { wrapper });
    act(() => {
      result.current.toggleExpand("t1");
    });
    act(() => {
      result.current.clearIfMatch("t1");
    });
    expect(result.current.expandedId).toBeNull();
  });

  it("clearIfMatch leaves expandedId unchanged when it does not match", () => {
    const { result } = renderHook(() => useTaskExpand(), { wrapper });
    act(() => {
      result.current.toggleExpand("t1");
    });
    act(() => {
      result.current.clearIfMatch("t2");
    });
    expect(result.current.expandedId).toBe("t1");
  });
});
