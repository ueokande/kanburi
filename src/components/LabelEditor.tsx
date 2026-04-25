import { useRef, useState } from "react";
import { labelStyle } from "../utils";
import styles from "./LabelEditor.module.css";

interface Props {
  labels: string[];
  onAdd: (label: string) => void;
  onRemove: (label: string) => void;
}

export function LabelEditor({ labels, onAdd, onRemove }: Props) {
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function showInput() {
    setInputVisible(true);
    // Focus after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    const raw = inputValue.trim().replace(/^#/, "");
    if (raw) onAdd(raw);
    setInputValue("");
    setInputVisible(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setInputValue("");
      setInputVisible(false);
    }
  }

  return (
    <div className={styles.labelEditor}>
      <span className={styles.labelEditorTitle}>Labels</span>
      <div className={styles.labelList}>
        {labels.map((label) => {
          const { bg, text } = labelStyle(label);
          return (
            <span
              key={label}
              className={styles.labelBadgeEditable}
              style={{ background: bg, color: text }}
            >
              #{label}
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
        {inputVisible ? (
          <input
            ref={inputRef}
            className={styles.labelInput}
            value={inputValue}
            placeholder="#NewLabel"
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commit}
          />
        ) : (
          <button
            type="button"
            className={styles.addBtn}
            aria-label="Add label"
            onClick={showInput}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}
