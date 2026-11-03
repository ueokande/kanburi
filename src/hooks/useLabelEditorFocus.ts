import type { FocusEvent, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { LabelField } from "./useLabelDraft";

interface Options {
  field: LabelField | null;
  focusTarget: string | null | undefined;
  inputRef: RefObject<HTMLInputElement>;
  panelRef: RefObject<HTMLDivElement>;
  onCancel: (restore?: boolean) => void;
}

/** Keep DOM focus and dismissal rules out of the label editing state machine. */
export function useLabelEditorFocus({
  field,
  focusTarget,
  inputRef,
  panelRef,
  onCancel,
}: Options) {
  const addRef = useRef<HTMLButtonElement>(null);
  const labelRefs = useRef(new Map<string, HTMLButtonElement>());

  useLayoutEffect(() => {
    if (field) {
      inputRef.current?.focus();
      if (field.kind === "edit") inputRef.current?.select();
    } else if (focusTarget !== undefined) {
      const target =
        focusTarget === null
          ? addRef.current
          : labelRefs.current.get(focusTarget);
      (target ?? addRef.current)?.focus();
    }
  }, [field, focusTarget, inputRef]);

  useEffect(() => {
    if (!field) return;
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (target !== inputRef.current && !panelRef.current?.contains(target))
        onCancel(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [field, inputRef, panelRef, onCancel]);

  function onBlur(event: FocusEvent<HTMLInputElement>) {
    if (!panelRef.current?.contains(event.relatedTarget as Node | null))
      onCancel(false);
  }

  function labelRef(label: string) {
    return (element: HTMLButtonElement | null) => {
      if (element) labelRefs.current.set(label, element);
      else labelRefs.current.delete(label);
    };
  }

  return { addRef, labelRef, onBlur };
}
