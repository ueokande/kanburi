// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCyclicIndex } from "./useCyclicIndex";

describe("useCyclicIndex", () => {
  it("starts at -1 (nothing highlighted)", () => {
    const { result } = renderHook(() => useCyclicIndex(3));
    expect(result.current.index).toBe(-1);
  });

  it("next() advances the index", () => {
    const { result } = renderHook(() => useCyclicIndex(3));
    act(() => result.current.next());
    expect(result.current.index).toBe(0);
    act(() => result.current.next());
    expect(result.current.index).toBe(1);
  });

  it("next() wraps around to 0 after the last index", () => {
    const { result } = renderHook(() => useCyclicIndex(2));
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.index).toBe(1);
    act(() => result.current.next());
    expect(result.current.index).toBe(0);
  });

  it("prev() wraps around to the last index from -1", () => {
    const { result } = renderHook(() => useCyclicIndex(3));
    act(() => result.current.prev());
    expect(result.current.index).toBe(2);
  });

  it("prev() decrements otherwise", () => {
    const { result } = renderHook(() => useCyclicIndex(3));
    act(() => result.current.next());
    act(() => result.current.next());
    expect(result.current.index).toBe(1);
    act(() => result.current.prev());
    expect(result.current.index).toBe(0);
  });

  it("reset() sets the index back to -1", () => {
    const { result } = renderHook(() => useCyclicIndex(3));
    act(() => result.current.next());
    act(() => result.current.reset());
    expect(result.current.index).toBe(-1);
  });

  it("set() sets an explicit index", () => {
    const { result } = renderHook(() => useCyclicIndex(3));
    act(() => result.current.set(2));
    expect(result.current.index).toBe(2);
  });

  it("next()/prev() are no-ops when length is 0", () => {
    const { result } = renderHook(() => useCyclicIndex(0));
    act(() => result.current.next());
    expect(result.current.index).toBe(-1);
    act(() => result.current.prev());
    expect(result.current.index).toBe(-1);
  });
});
