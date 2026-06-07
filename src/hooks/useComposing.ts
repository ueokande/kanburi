import type React from "react";
import { useRef } from "react";

/**
 * Returns spreadable input props and a keydown guard for IME composition.
 *
 * Usage:
 *   const composing = useComposing();
 *   <input {...composing.props} onKeyDown={(e) => {
 *     if (e.key === "Enter" && !composing.isComposing(e)) commit();
 *   }} />
 *
 * Background: `nativeEvent.isComposing` and a manual ref alone are unreliable on
 * some platforms (e.g. WKWebView) because `compositionend` fires *before* the
 * final Enter `keydown`, leaving both flags already cleared. `keyCode === 229` is
 * the IME sentinel that browsers reliably set throughout active composition.
 */
export function useComposing() {
  const composingRef = useRef(false);

  const props = {
    onCompositionStart: () => {
      composingRef.current = true;
    },
    onCompositionEnd: () => {
      composingRef.current = false;
    },
  };

  // Triple-check: manual ref + nativeEvent.isComposing + keyCode 229 (IME sentinel).
  const isComposing = (e: React.KeyboardEvent) =>
    composingRef.current ||
    e.nativeEvent.isComposing ||
    e.nativeEvent.keyCode === 229;

  return { props, isComposing };
}
