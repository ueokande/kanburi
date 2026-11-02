import { createPortal } from "react-dom";
import {
  type LabelEditorOptions,
  useLabelEditor,
} from "../hooks/useLabelEditor";
import { labelStyle } from "../utils";
import styles from "./LabelEditor.module.css";

interface Props extends LabelEditorOptions {
  onRemove: (label: string) => void;
}

export function LabelEditor({ labels, onAdd, onRemove, onRename }: Props) {
  const editor = useLabelEditor({ labels, onAdd, onRename });
  const input = <input {...editor.inputProps} className={styles.labelInput} />;

  return (
    <div className={styles.labelEditor}>
      <span className={styles.labelEditorTitle}>Labels</span>
      {editor.field?.kind === "edit" && (
        <span id={editor.hintId} className={styles.hint}>
          Changes apply to this card only.
        </span>
      )}
      <div className={styles.labelList}>
        {labels.map((text) => {
          if (editor.field?.kind === "edit" && editor.field.original === text)
            return <span key={text}>{input}</span>;
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
                {...editor.getLabelButtonProps(text)}
                aria-label={`Change label ${text} on this card`}
                title="Change this card's label"
              >
                #{text}
              </button>
              <button
                type="button"
                aria-label={`Remove label ${text}`}
                disabled={editor.saving}
                onClick={() => onRemove(text)}
              >
                ×
              </button>
            </span>
          );
        })}
        {editor.field?.kind === "add" ? (
          input
        ) : (
          <button
            {...editor.addButtonProps}
            type="button"
            className={styles.addBtn}
            aria-label="Add label"
          >
            +
          </button>
        )}
      </div>
      {editor.field && editor.error && (
        <span id={editor.errorId} role="status" className={styles.error}>
          {editor.error}
        </span>
      )}
      {editor.field &&
        editor.options.length > 0 &&
        createPortal(
          <div
            {...editor.popup}
            role="listbox"
            aria-label="Label suggestions"
            className={styles.suggestions}
          >
            {editor.options.map((option, index) => (
              <div key={`${option.create}-${option.text}`} role="none">
                <button
                  type="button"
                  role="option"
                  {...editor.getOptionProps(index)}
                  tabIndex={-1}
                  className={styles.suggestionItem}
                  onMouseDown={(event) => event.preventDefault()}
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
