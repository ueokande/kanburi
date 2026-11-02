import { useCallback, useRef, useState } from "react";
import { normalizeLabel } from "../utils";

export type LabelField = { kind: "add" } | { kind: "edit"; original: string };
export interface LabelDraftOptions {
  labels: string[];
  onAdd: (label: string) => void | Promise<void>;
  onRename: (oldLabel: string, newLabel: string) => void | Promise<void>;
}

function validationMessage(
  label: string,
  labels: string[],
  field: LabelField | null,
) {
  if (/\s/u.test(label)) return "Labels cannot contain spaces.";
  const original = field?.kind === "edit" ? field.original : undefined;
  if (label !== original && labels.includes(label))
    return "Already added to this card.";
  return "";
}

/** Own the draft lifecycle; only a successful explicit commit closes an edit. */
export function useLabelDraft({ labels, onAdd, onRename }: LabelDraftOptions) {
  const [field, setField] = useState<LabelField | null>(null);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  // undefined leaves focus alone; null targets Add; a string targets that label.
  const [focusTarget, setFocusTarget] = useState<string | null | undefined>();
  const savingRef = useRef(false);
  const label = normalizeLabel(value);
  const error = validationMessage(label, labels, field) || saveError;

  function start(next: LabelField) {
    if (savingRef.current) return;
    setFocusTarget(undefined);
    setField(next);
    setValue(next.kind === "edit" ? next.original : "");
    setSaveError("");
  }

  function changeValue(next: string) {
    setValue(next);
    setSaveError("");
  }

  const cancel = useCallback(
    (restore = true) => {
      if (savingRef.current) return;
      const original = field?.kind === "edit" ? field.original : null;
      setFocusTarget(restore ? original : undefined);
      setField(null);
    },
    [field],
  );

  async function commit(text: string) {
    if (!field || savingRef.current) return;
    const raw = normalizeLabel(text);
    if (!raw || validationMessage(raw, labels, field)) return;
    if (field.kind === "edit" && raw === field.original) {
      cancel();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      if (field.kind === "edit") await onRename(field.original, raw);
      else await onAdd(raw);
      setFocusTarget(field.kind === "edit" ? raw : null);
      setField(null);
    } catch {
      setSaveError("Could not save the label. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return {
    field,
    value,
    label,
    saving,
    error,
    focusTarget,
    start,
    changeValue,
    cancel,
    commit,
  };
}
