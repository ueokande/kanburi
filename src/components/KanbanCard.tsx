import React from "react";
import type { Task } from "../types";
import { nextStatus } from "../utils";
import { DateBadge } from "./DateBadge";
import { DatePicker } from "./DatePicker";
import { DeleteButton } from "./DeleteButton";
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
  onAddLabel: () => void;
  onRemoveLabel: (label: string) => void;
  labelInputValue: string;
  onLabelInputChange: (value: string) => void;
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
  labelInputValue,
  onLabelInputChange,
  onDragStart,
  onDragEnd,
}: Props) {
  return (
    <li
      className={`${styles.card} ${task.status === "done" ? styles.done : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <ExpandArea expanded={isExpanded} onToggle={onToggleExpand}>
        <ExpandHeader>
          {/* Main row */}
          <div className={styles.cardRow}>
            <StatusButton
              status={task.status}
              onClick={() => onUpdate({ status: nextStatus(task.status) })}
            />
            <span className={styles.cardText}>{task.text}</span>
          </div>

          {/* Labels + due date */}
          {(task.labels.length > 0 || task.due_date) && (
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
            inputValue={labelInputValue}
            onAdd={onAddLabel}
            onRemove={onRemoveLabel}
            onInputChange={onLabelInputChange}
          />
          <DescriptionInput
            value={task.description}
            onChange={(value) => onUpdate({ description: value })}
          />
          <DeleteButton onClick={onDelete} />
        </ExpandDetail>
      </ExpandArea>
    </li>
  );
}
