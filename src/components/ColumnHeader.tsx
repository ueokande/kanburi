import { confirm } from "@tauri-apps/plugin-dialog";
import type { RefObject } from "react";
import { useComposing } from "../hooks/useComposing";
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
  onSortByDueDate: () => void;
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
  onSortByDueDate,
}: ColumnHeaderProps) {
  const composing = useComposing();

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
          {...composing.props}
          onBlur={onCommitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !composing.isComposing(e))
              onCommitRename();
            if (e.key === "Escape" && !composing.isComposing(e))
              onCancelRename();
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
        <PopupMenuItem onClick={onSortByDueDate}>
          Sort by due date
        </PopupMenuItem>
        <PopupMenuItem danger onClick={handleDelete}>
          Delete column
        </PopupMenuItem>
      </PopupMenu>
    </div>
  );
}
