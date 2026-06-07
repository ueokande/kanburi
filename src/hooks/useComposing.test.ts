// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { describe, expect, it } from "vitest";
import { useComposing } from "./useComposing";

function fakeKeyEvent(
  overrides: { isComposing?: boolean; keyCode?: number } = {},
): React.KeyboardEvent {
  return {
    nativeEvent: {
      isComposing: overrides.isComposing ?? false,
      keyCode: overrides.keyCode ?? 0,
    },
  } as unknown as React.KeyboardEvent;
}

describe("useComposing", () => {
  it("isComposing returns false when no composition flags are set", () => {
    const { result } = renderHook(() => useComposing());
    expect(result.current.isComposing(fakeKeyEvent())).toBe(false);
  });

  it("isComposing returns true after onCompositionStart", () => {
    const { result } = renderHook(() => useComposing());
    act(() => {
      result.current.props.onCompositionStart();
    });
    expect(result.current.isComposing(fakeKeyEvent())).toBe(true);
  });

  it("isComposing returns false after onCompositionEnd clears the ref", () => {
    const { result } = renderHook(() => useComposing());
    act(() => {
      result.current.props.onCompositionStart();
    });
    act(() => {
      result.current.props.onCompositionEnd();
    });
    expect(result.current.isComposing(fakeKeyEvent())).toBe(false);
  });

  it("isComposing returns true when nativeEvent.isComposing is true", () => {
    const { result } = renderHook(() => useComposing());
    expect(
      result.current.isComposing(fakeKeyEvent({ isComposing: true })),
    ).toBe(true);
  });

  it("isComposing returns true when keyCode is 229 (WKWebView IME sentinel)", () => {
    const { result } = renderHook(() => useComposing());
    // Covers the case where compositionend fired before keydown (WKWebView behaviour)
    expect(result.current.isComposing(fakeKeyEvent({ keyCode: 229 }))).toBe(
      true,
    );
  });
});
