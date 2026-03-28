import type { RefObject } from "react";
import type { Column, Task } from "../types";
import { KanbanCard } from "./KanbanCard";
import styles from "./KanbanColumn.module.css";

interface Props {
  column: Column;
  tasks: Task[];
  // Column rename
  isEditing: boolean;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  renameInputRef: RefObject<HTMLInputElement>;
  onDeleteColumn: () => void;
  // Task add
  newTaskText: string;
  onNewTaskTextChange: (value: string) => void;
  onAddTask: () => void;
  // Card state / ops
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onAddLabel: (taskId: string) => void;
  onRemoveLabel: (taskId: string, label: string) => void;
  labelInput: Record<string, string>;
  onLabelInputChange: (taskId: string, value: string) => void;
  // DnD
  onDragStart: (taskId: string) => void;
  onDrop: () => void;
}

export function KanbanColumn({
  column,
  tasks,
  isEditing,
  editingName,
  onEditingNameChange,
  onStartRename,
  onCommitRename,
  onCancelRename,
  renameInputRef,
  onDeleteColumn,
  newTaskText,
  onNewTaskTextChange,
  onAddTask,
  expandedId,
  onToggleExpand,
  onUpdateTask,
  onDeleteTask,
  onAddLabel,
  onRemoveLabel,
  labelInput,
  onLabelInputChange,
  onDragStart,
  onDrop,
}: Props) {
  return (
    <section
      className={styles.column}
      aria-label={column.name}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      {/* Column header */}
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
            {column.name}
            <span className={styles.taskCount}>{tasks.length}</span>
          </button>
        )}
        <button
          type="button"
          className={styles.deleteColBtn}
          onClick={onDeleteColumn}
          aria-label={`Delete ${column.name} column`}
        >
          ✕
        </button>
      </div>

      {/* Cards */}
      <ul className={styles.cardList}>
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            isExpanded={expandedId === task.id}
            onToggleExpand={() => onToggleExpand(task.id)}
            onUpdate={(patch) => onUpdateTask(task.id, patch)}
            onDelete={() => onDeleteTask(task.id)}
            onAddLabel={() => onAddLabel(task.id)}
            onRemoveLabel={(label) => onRemoveLabel(task.id, label)}
            labelInputValue={labelInput[task.id] ?? ""}
            onLabelInputChange={(v) => onLabelInputChange(task.id, v)}
            onDragStart={() => onDragStart(task.id)}
          />
        ))}
      </ul>

      {/* Add task */}
      <div className={styles.addTask}>
        <input
          value={newTaskText}
          onChange={(e) => onNewTaskTextChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onAddTask()}
          placeholder="Add task… #Label @date"
        />
        <button type="button" onClick={onAddTask}>
          Add
        </button>
      </div>
    </section>
  );
}
