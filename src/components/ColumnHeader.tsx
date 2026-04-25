import { confirm } from "@tauri-apps/plugin-dialog";
import type { RefObject } from "react";
import { PopupMenu, PopupMenuItem } from "./PopupMenu";
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
  async function handleDelete() {
    const msg =
      taskCount === 0
        ? `Delete the "${name}" column?`
        : `Delete the "${name}" column? This will remove ${taskCount} task${taskCount === 1 ? "" : "s"}.`;
    const ok = await confirm(msg, { title: "Delete column", kind: "warning" });
    if (ok) onDelete();
  }

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
      <PopupMenu label="Column actions" triggerClassName={styles.menuTrigger}>
        <PopupMenuItem danger onClick={handleDelete}>Delete column</PopupMenuItem>
      </PopupMenu>
    </div>
  );
}
