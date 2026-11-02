import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useKanbanState } from "../context/BoardContext";
import { useComposing } from "../hooks/useComposing";
import { useLabelPopover } from "../hooks/useLabelPopover";
import { getAllLabels, labelStyle, normalizeLabel } from "../utils";
import styles from "./LabelEditor.module.css";

interface Props {
  labels: string[];
  onAdd: (label: string) => void | Promise<void>;
  onRemove: (label: string) => void;
  onRename: (oldLabel: string, newLabel: string) => void | Promise<void>;
}

type Field = { kind: "add" } | { kind: "edit"; original: string };

export function LabelEditor({ labels, onAdd, onRemove, onRename }: Props) {
  const { board } = useKanbanState();
  const [field, setField] = useState<Field | null>(null);
  const [value, setValue] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const labelRefs = useRef(new Map<string, HTMLButtonElement>());
  const restoreFocus = useRef<string | null | undefined>(undefined);
  const savingRef = useRef(false);
  const composing = useComposing();
  const id = useId();
  const listId = `${id}-options`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const label = normalizeLabel(value);
  const otherLabels = labels.filter(
    (l) => field?.kind !== "edit" || l !== field.original,
  );
  const invalid = /\s/u.test(label);
  const duplicate = otherLabels.includes(label);
  const message = invalid
    ? "Labels cannot contain spaces."
    : duplicate
      ? "Already added to this card."
      : "";
  const allLabels = getAllLabels(board.tasks);
  const suggestions =
    field && !invalid
      ? allLabels
          .filter(
            (l) =>
              !otherLabels.includes(l) &&
              l.toLocaleLowerCase().startsWith(label.toLocaleLowerCase()),
          )
          .slice(0, 5)
      : [];
  const canCreate =
    !!label && !invalid && !duplicate && !allLabels.includes(label);
  const options = [
    ...suggestions.map((text) => ({ text, create: false })),
    ...(canCreate ? [{ text: label, create: true }] : []),
  ];
  const activeIndex = highlight < options.length ? highlight : -1;
  const { panelRef, position } = useLabelPopover(
    inputRef,
    field !== null,
    options.length,
  );

  useLayoutEffect(() => {
    if (field) {
      inputRef.current?.focus();
      if (field.kind === "edit") inputRef.current?.select();
    } else if (restoreFocus.current !== undefined) {
      const target =
        restoreFocus.current === null
          ? addRef.current
          : labelRefs.current.get(restoreFocus.current);
      (target ?? addRef.current)?.focus();
      restoreFocus.current = undefined;
    }
  }, [field]);

  function start(next: Field) {
    if (savingRef.current) return;
    setField(next);
    setValue(next.kind === "edit" ? next.original : "");
    setHighlight(-1);
    setSaveError("");
  }

  function cancel(restore = true) {
    if (savingRef.current) return;
    restoreFocus.current = restore
      ? field?.kind === "edit"
        ? field.original
        : null
      : undefined;
    setField(null);
  }

  useEffect(() => {
    if (!field) return;
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (target !== inputRef.current && !panelRef.current?.contains(target))
        cancel(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  });

  useLayoutEffect(() => {
    if (activeIndex >= 0)
      document
        .getElementById(`${id}-option-${activeIndex}`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, id]);

  async function commit(text: string) {
    if (!field || savingRef.current) return;
    const raw = normalizeLabel(text);
    if (!raw || /\s/u.test(raw) || otherLabels.includes(raw)) return;
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
      restoreFocus.current = field.kind === "edit" ? raw : null;
      setField(null);
    } catch {
      setSaveError("Could not save the label. Please try again.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (composing.isComposing(event)) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length)
        setHighlight((i) =>
          event.key === "ArrowDown"
            ? (i + 1) % options.length
            : i <= 0
              ? options.length - 1
              : i - 1,
        );
    } else if (event.key === "Enter") {
      event.preventDefault();
      void commit(activeIndex >= 0 ? options[activeIndex].text : label);
    }
  }

  function editor() {
    return (
      <input
        ref={inputRef}
        className={styles.labelInput}
        aria-label={
          field?.kind === "edit"
            ? `Change label ${field.original} on this card`
            : "Add label"
        }
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={options.length > 0}
        aria-controls={options.length ? listId : undefined}
        aria-activedescendant={
          activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
        }
        aria-describedby={
          [
            field?.kind === "edit" ? hintId : null,
            message || saveError ? errorId : null,
          ]
            .filter(Boolean)
            .join(" ") || undefined
        }
        aria-invalid={!!message || !!saveError}
        aria-busy={saving}
        value={value}
        readOnly={saving}
        placeholder="#Label"
        onChange={(event) => {
          setValue(event.target.value);
          setHighlight(-1);
          setSaveError("");
        }}
        {...composing.props}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          if (!panelRef.current?.contains(event.relatedTarget as Node | null))
            cancel(false);
        }}
      />
    );
  }

  return (
    <div className={styles.labelEditor}>
      <span className={styles.labelEditorTitle}>Labels</span>
      {field?.kind === "edit" && (
        <span id={hintId} className={styles.hint}>
          Changes apply to this card only.
        </span>
      )}
      <div className={styles.labelList}>
        {labels.map((text) => {
          if (field?.kind === "edit" && field.original === text)
            return <span key={text}>{editor()}</span>;
          const color = labelStyle(text);
          return (
            <span
              key={text}
              className={styles.labelBadgeEditable}
              style={{ background: color.bg, color: color.text }}
            >
              <button
                type="button"
                className={styles.labelText}
                disabled={saving}
                ref={(element) => {
                  if (element) labelRefs.current.set(text, element);
                  else labelRefs.current.delete(text);
                }}
                aria-label={`Change label ${text} on this card`}
                title="Change this card's label"
                onClick={() => start({ kind: "edit", original: text })}
              >
                #{text}
              </button>
              <button
                type="button"
                aria-label={`Remove label ${text}`}
                disabled={saving}
                onClick={() => onRemove(text)}
              >
                ×
              </button>
            </span>
          );
        })}
        {field?.kind === "add" ? (
          editor()
        ) : (
          <button
            ref={addRef}
            type="button"
            className={styles.addBtn}
            aria-label="Add label"
            disabled={field !== null}
            onClick={() => start({ kind: "add" })}
          >
            +
          </button>
        )}
      </div>
      {field && (message || saveError) && (
        <span id={errorId} role="status" className={styles.error}>
          {message || saveError}
        </span>
      )}
      {field &&
        options.length > 0 &&
        createPortal(
          <div
            id={listId}
            ref={panelRef}
            role="listbox"
            aria-label="Label suggestions"
            className={styles.suggestions}
            style={position}
          >
            {options.map((option, index) => (
              <div key={`${option.create}-${option.text}`} role="none">
                <button
                  type="button"
                  role="option"
                  id={`${id}-option-${index}`}
                  aria-selected={activeIndex === index}
                  tabIndex={-1}
                  disabled={saving}
                  className={styles.suggestionItem}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => {
                    void commit(option.text);
                  }}
                >
                  {option.create ? `Add #${option.text}` : `#${option.text}`}
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
