import type { RefObject } from "react";
import styles from "./ColumnHeader.module.css";

export interface ColumnHeaderProps {
  name: string;
  taskCount: number;
  isEditing: boolean;
  editingName: string;
  onEditingNameChange: (value: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  renameInputRef: RefObject<HTMLInputElement>;
  onDelete: () => void;
}

export function ColumnHeader({
  name,
  taskCount,
  isEditing,
  editingName,
  onEditingNameChange,
  onStartRename,
  onCommitRename,
  onCancelRename,
  renameInputRef,
  onDelete,
}: ColumnHeaderProps) {
  return (
    <div className={styles.columnHeader}>
      {isEditing ? (
        <input
          ref={renameInputRef}
          className={styles.columnNameInput}
          value={editingName}
          onChange={(e) => onEditingNameChange(e.target.value)}
          onBlur={onCommitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommitRename();
            if (e.key === "Escape") onCancelRename();
          }}
        />
      ) : (
        <button
          type="button"
          className={styles.columnNameBtn}
          onClick={onStartRename}
          title="Click to rename"
        >
          {name}
          <span className={styles.taskCount}>{taskCount}</span>
        </button>
      )}
      <button
        type="button"
        className={styles.deleteColBtn}
        onClick={onDelete}
        aria-label={`Delete ${name} column`}
      >
        ✕
      </button>
    </div>
  );
}
