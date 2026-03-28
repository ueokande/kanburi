import type { Task } from "../types";
import { STATUS_ICON } from "../types";
import { isOverdue, labelStyle, nextStatus } from "../utils";
import styles from "./KanbanCard.module.css";

interface Props {
  task: Task;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (patch: Partial<Task>) => void;
  onDelete: () => void;
  onAddLabel: () => void;
  onRemoveLabel: (label: string) => void;
  labelInputValue: string;
  onLabelInputChange: (value: string) => void;
  onDragStart: () => void;
}

export function KanbanCard({
  task,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onAddLabel,
  onRemoveLabel,
  labelInputValue,
  onLabelInputChange,
  onDragStart,
}: Props) {
  return (
    <li
      className={`${styles.card} ${task.status === "done" ? styles.done : ""}`}
      draggable
      onDragStart={onDragStart}
    >
      {/* Main row */}
      <div className={styles.cardRow}>
        <button
          type="button"
          className={`${styles.statusBtn} ${statusClass(task.status, styles)}`}
          aria-label={`Status: ${task.status}. Click to advance.`}
          onClick={() => onUpdate({ status: nextStatus(task.status) })}
        >
          {STATUS_ICON[task.status]}
        </button>
        <span className={styles.cardText}>{task.text}</span>
        <button
          type="button"
          className={styles.expandBtn}
          aria-label={isExpanded ? "Collapse" : "Expand"}
          onClick={onToggleExpand}
        >
          {isExpanded ? "▲" : "▼"}
        </button>
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={onDelete}
          aria-label="Delete task"
        >
          ✕
        </button>
      </div>

      {/* Labels + due date */}
      {(task.labels.length > 0 || task.due_date) && (
        <div className={styles.cardMeta}>
          {task.labels.map((label) => {
            const { bg, text } = labelStyle(label);
            return (
              <span
                key={label}
                className={styles.labelBadge}
                style={{ background: bg, color: text }}
              >
                #{label}
              </span>
            );
          })}
          {task.due_date && (
            <span
              className={`${styles.dueBadge} ${isOverdue(task.due_date) ? styles.dueBadgeOverdue : ""}`}
            >
              📅 {task.due_date}
            </span>
          )}
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div className={styles.cardDetails}>
          <label>
            Due date
            <input
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) =>
                onUpdate({ due_date: e.target.value || undefined })
              }
            />
          </label>

          <div className={styles.labelEditor}>
            <span className={styles.labelEditorTitle}>Labels</span>
            <div className={styles.labelList}>
              {task.labels.map((label) => {
                const { bg, text } = labelStyle(label);
                return (
                  <span
                    key={label}
                    className={`${styles.labelBadge} ${styles.labelBadgeEditable}`}
                    style={{ background: bg, color: text }}
                  >
                    #{label}
                    <button
                      type="button"
                      aria-label={`Remove label ${label}`}
                      onClick={() => onRemoveLabel(label)}
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
            <div className={styles.labelInputRow}>
              <input
                value={labelInputValue}
                placeholder="#NewLabel"
                onChange={(e) => onLabelInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAddLabel()}
              />
              <button type="button" onClick={onAddLabel}>
                Add
              </button>
            </div>
          </div>

          <label>
            Description
            <textarea
              rows={4}
              value={task.description ?? ""}
              placeholder="Add a description…"
              onChange={(e) =>
                onUpdate({ description: e.target.value || undefined })
              }
            />
          </label>
        </div>
      )}
    </li>
  );
}

function statusClass(
  status: Task["status"],
  s: Record<string, string>,
): string {
  if (status === "todo") return s.statusTodo;
  if (status === "in_progress") return s.statusInProgress;
  return s.statusDone;
}
