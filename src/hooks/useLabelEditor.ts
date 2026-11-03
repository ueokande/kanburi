import type { InputHTMLAttributes } from "react";
import { useId, useRef } from "react";
import { useLabelAutocomplete } from "./useLabelAutocomplete";
import type { LabelDraftOptions, LabelField } from "./useLabelDraft";
import { useLabelDraft } from "./useLabelDraft";
import { useLabelEditorFocus } from "./useLabelEditorFocus";
import { useLabelPopover } from "./useLabelPopover";

export type { LabelDraftOptions as LabelEditorOptions } from "./useLabelDraft";

/** Compose editing, suggestions, and focus into the view's small public API. */
export function useLabelEditor(props: LabelDraftOptions) {
  const draft = useLabelDraft(props);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const autocomplete = useLabelAutocomplete({
    labels: props.labels,
    label: draft.label,
    field: draft.field,
    onCommit: draft.commit,
    onCancel: draft.cancel,
  });
  const popover = useLabelPopover(
    inputRef,
    draft.field !== null,
    autocomplete.options.length,
  );
  const focus = useLabelEditorFocus({
    field: draft.field,
    focusTarget: draft.focusTarget,
    inputRef,
    panelRef: popover.panelRef,
    onCancel: draft.cancel,
  });

  function start(field: LabelField) {
    draft.start(field);
    autocomplete.reset();
  }

  const inputProps: InputHTMLAttributes<HTMLInputElement> = {
    "aria-label":
      draft.field?.kind === "edit"
        ? `Change label ${draft.field.original} on this card`
        : "Add label",
    role: "combobox",
    "aria-autocomplete": "list",
    "aria-expanded": autocomplete.options.length > 0,
    "aria-controls": autocomplete.options.length
      ? autocomplete.listId
      : undefined,
    "aria-activedescendant": autocomplete.activeOptionId,
    "aria-describedby":
      [
        draft.field?.kind === "edit" ? hintId : null,
        draft.error ? errorId : null,
      ]
        .filter(Boolean)
        .join(" ") || undefined,
    "aria-invalid": !!draft.error,
    "aria-busy": draft.saving,
    value: draft.value,
    readOnly: draft.saving,
    placeholder: "#Label",
    onChange: (event) => {
      draft.changeValue(event.target.value);
      autocomplete.reset();
    },
    ...autocomplete.inputHandlers,
    onBlur: focus.onBlur,
  };

  return {
    field: draft.field,
    saving: draft.saving,
    error: draft.error,
    hintId,
    errorId,
    inputProps: { ...inputProps, ref: inputRef },
    addButtonProps: {
      ref: focus.addRef,
      disabled: draft.field !== null,
      onClick: () => start({ kind: "add" }),
    },
    getLabelButtonProps: (label: string) => ({
      ref: focus.labelRef(label),
      disabled: draft.saving,
      onClick: () => start({ kind: "edit", original: label }),
    }),
    popup: {
      ref: popover.panelRef,
      style: popover.position,
      id: autocomplete.listId,
    },
    options: autocomplete.options,
    getOptionProps: (index: number) => ({
      id: autocomplete.getOptionId(index),
      "aria-selected": autocomplete.activeIndex === index,
      disabled: draft.saving,
      onMouseEnter: () => autocomplete.highlight(index),
      onClick: () => {
        void draft.commit(autocomplete.options[index].text);
      },
    }),
  };
}
