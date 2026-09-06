import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useKanbanState } from "../context/BoardContext";
import { useComposing } from "../hooks/useComposing";
import { useCyclicIndex } from "../hooks/useCyclicIndex";
import { useFloatingPosition } from "../hooks/useFloatingPosition";
import { getAllLabels, labelStyle } from "../utils";
import styles from "./LabelEditor.module.css";

const MAX_SUGGESTIONS = 5;

interface Props {
  labels: string[];
  onAdd: (label: string) => void;
  onRemove: (label: string) => void;
  onRename: (oldLabel: string, newLabel: string) => void;
}

/** Which label input is currently active: the "+" add field, or an existing
 * label being edited in place (identified by its original text). */
type ActiveField = { kind: "add" } | { kind: "edit"; original: string } | null;

export function LabelEditor({ labels, onAdd, onRemove, onRename }: Props) {
  const { board } = useKanbanState();
  const [active, setActive] = useState<ActiveField>(null);
  const [inputValue, setInputValue] = useState("");
  const {
    anchorRef: inputRef,
    position: popoverPos,
    update: updatePopoverPos,
  } = useFloatingPosition<HTMLInputElement>();
  const popoverRef = useRef<HTMLUListElement>(null);
  const composing = useComposing();

  // Labels already on this task, excluding the one currently being edited
  // (so the label being edited doesn't hide itself as a taken suggestion).
  const otherLabels = labels.filter(
    (l) => !(active?.kind === "edit" && l === active.original),
  );

  const query = inputValue.trim().replace(/^#/, "").toLowerCase();
  const suggestions = active
    ? getAllLabels(board.tasks)
        .filter((label) => !otherLabels.includes(label))
        .filter((label) => label.toLowerCase().startsWith(query))
        .slice(0, MAX_SUGGESTIONS)
    : [];
  const highlight = useCyclicIndex(suggestions.length);

  function showAddInput() {
    setActive({ kind: "add" });
    setInputValue("");
    // Focus after render
    setTimeout(() => {
      inputRef.current?.focus();
      updatePopoverPos();
    }, 0);
  }

  function showEditInput(label: string) {
    setActive({ kind: "edit", original: label });
    setInputValue(label);
    // Focus and select after render
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
      updatePopoverPos();
    }, 0);
  }

  function reset() {
    setActive(null);
    setInputValue("");
    highlight.reset();
  }

  function commit(label?: string) {
    const raw = (label ?? inputValue).trim().replace(/^#/, "");
    if (active?.kind === "edit") {
      if (raw) onRename(active.original, raw);
    } else if (raw) {
      onAdd(raw);
    }
    reset();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (composing.isComposing(e)) return;
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      highlight.next();
      return;
    }
    if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      highlight.prev();
      return;
    }
    if (e.key === "Enter") {
      const highlighted =
        highlight.index >= 0 ? suggestions[highlight.index] : undefined;
      commit(highlighted);
      return;
    }
    if (e.key === "Escape") {
      reset();
    }
  }

  return (
    <div className={styles.labelEditor}>
      <span className={styles.labelEditorTitle}>Labels</span>
      <div className={styles.labelList}>
        {labels.map((label) => {
          if (active?.kind === "edit" && active.original === label) {
            return (
              <input
                key={label}
                ref={inputRef}
                className={styles.labelInput}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  highlight.reset();
                }}
                {...composing.props}
                onKeyDown={handleKeyDown}
                onBlur={() => commit()}
              />
            );
          }
          const { bg, text } = labelStyle(label);
          return (
            <span
              key={label}
              className={styles.labelBadgeEditable}
              style={{ background: bg, color: text }}
            >
              <button
                type="button"
                className={styles.labelText}
                aria-label={`Edit label ${label}`}
                onClick={() => showEditInput(label)}
              >
                #{label}
              </button>
              <button
                type="button"
                aria-label={`Remove label ${label}`}
                onClick={() => onRemove(label)}
              >
                ×
              </button>
            </span>
          );
        })}
        {active?.kind === "add" ? (
          <input
            ref={inputRef}
            className={styles.labelInput}
            value={inputValue}
            placeholder="#NewLabel"
            onChange={(e) => {
              setInputValue(e.target.value);
              highlight.reset();
            }}
            {...composing.props}
            onKeyDown={handleKeyDown}
            onBlur={() => commit()}
          />
        ) : (
          !active && (
            <button
              type="button"
              className={styles.addBtn}
              aria-label="Add label"
              onClick={showAddInput}
            >
              +
            </button>
          )
        )}
      </div>

      {active &&
        suggestions.length > 0 &&
        createPortal(
          <ul
            ref={popoverRef}
            className={styles.suggestions}
            style={{ top: popoverPos.top, left: popoverPos.left }}
          >
            {suggestions.map((label, index) => (
              <li key={label}>
                <button
                  type="button"
                  className={`${styles.suggestionItem} ${index === highlight.index ? styles.suggestionHighlighted : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => highlight.set(index)}
                  onClick={() => commit(label)}
                >
                  #{label}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}
