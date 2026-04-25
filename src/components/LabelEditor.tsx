import { labelStyle } from "../utils";
import styles from "./LabelEditor.module.css";

interface Props {
  labels: string[];
  inputValue: string;
  onAdd: () => void;
  onRemove: (label: string) => void;
  onInputChange: (value: string) => void;
}

export function LabelEditor({
  labels,
  inputValue,
  onAdd,
  onRemove,
  onInputChange,
}: Props) {
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
      </div>
      <div className={styles.labelInputRow}>
        <input
          value={inputValue}
          placeholder="#NewLabel"
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAdd()}
        />
        <button type="button" onClick={onAdd}>
          Add
        </button>
      </div>
    </div>
  );
}
