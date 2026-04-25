import React from "react";
import type { Task } from "../types";
import { nextStatus } from "../utils";
import { CardMenu } from "./CardMenu";
import { DateBadge } from "./DateBadge";
import { DatePicker } from "./DatePicker";
import { DescriptionInput } from "./DescriptionInput";
import { ExpandArea, ExpandDetail, ExpandHeader } from "./ExpandArea";
import styles from "./KanbanCard.module.css";
import { LabelBadge } from "./LabelBadge";
import { LabelEditor } from "./LabelEditor";
import { StatusButton } from "./StatusButton";

interface Props {
  task: Task;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (patch: Partial<Task>) => void;
  onDelete: () => void;
  onAddLabel: (label: string) => void;
  onRemoveLabel: (label: string) => void;
  onDragStart: (event: React.DragEvent<HTMLLIElement>) => void;
  onDragEnd: (event: React.DragEvent<HTMLLIElement>) => void;
}

export function KanbanCard({
  task,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onAddLabel,
  onRemoveLabel,
  onDragStart,
  onDragEnd,
}: Props) {
  return (
    <li
      className={`${styles.card} ${task.status === "done" ? styles.done : ""} ${isExpanded ? styles.expanded : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <ExpandArea expanded={isExpanded} onToggle={onToggleExpand}>
        <ExpandHeader>
          {/* Main row */}
          <div className={styles.cardRow}>
            {/* stopPropagation prevents status click from toggling expand */}
            <span className={styles.statusWrap} onClick={(e) => e.stopPropagation()}>
              <StatusButton
                status={task.status}
                onClick={() => onUpdate({ status: nextStatus(task.status) })}
              />
            </span>
            <span className={styles.cardText}>{task.text}</span>
            <span className={styles.menuWrap}>
              <CardMenu onDelete={onDelete} />
            </span>
          </div>

          {/* Labels + due date — hidden when expanded (shown in detail instead) */}
          {!isExpanded && (task.labels.length > 0 || task.due_date) && (
            <div className={styles.cardMeta}>
              {task.labels.map((label) => (
                <LabelBadge key={label} label={label} />
              ))}
              {task.due_date && <DateBadge date={task.due_date} />}
            </div>
          )}
        </ExpandHeader>

        <ExpandDetail>
          <DatePicker
            date={task.due_date}
            onChange={(value) => onUpdate({ due_date: value })}
          />
          <LabelEditor
            labels={task.labels}
            onAdd={onAddLabel}
            onRemove={onRemoveLabel}
          />
          <DescriptionInput
            value={task.description}
            onChange={(value) => onUpdate({ description: value })}
          />
        </ExpandDetail>
      </ExpandArea>
    </li>
  );
}
