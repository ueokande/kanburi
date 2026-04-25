import React from "react";
import type { Task } from "../types";
import { AddTaskInput, type AddTaskInputProps } from "./AddTaskInput";
import { ColumnHeader, type ColumnHeaderProps } from "./ColumnHeader";
import { KanbanCard } from "./KanbanCard";
import styles from "./KanbanColumn.module.css";

export interface CardListProps {
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onAddLabel: (taskId: string) => void;
  onRemoveLabel: (taskId: string, label: string) => void;
  labelInput: Record<string, string>;
  onLabelInputChange: (taskId: string, value: string) => void;
  onDragStart: (taskId: string, event: React.DragEvent<HTMLLIElement>) => void;
  onDragEnd: (event: React.DragEvent<HTMLLIElement>) => void;
}

export interface ColumnDndProps {
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
}

interface Props {
  tasks: Task[];
  header: ColumnHeaderProps;
  addTask: AddTaskInputProps;
  cards: CardListProps;
  dnd: ColumnDndProps;
}

export function KanbanColumn({ tasks, header, addTask, cards, dnd }: Props) {
  return (
    <section
      className={styles.column}
      aria-label={header.name}
      data-column={header.name}
      onDragOver={dnd.onDragOver}
      // onDrop={dnd.onDrop}
      onDrop={(e) => {
        console.log("Column onDrop", header.name);
        dnd.onDrop(e);
      }}
    >
      <ColumnHeader {...header} />

      <ul className={styles.cardList} data-card-list>
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            isExpanded={cards.expandedId === task.id}
            onToggleExpand={() => cards.onToggleExpand(task.id)}
            onUpdate={(patch) => cards.onUpdate(task.id, patch)}
            onDelete={() => cards.onDelete(task.id)}
            onAddLabel={() => cards.onAddLabel(task.id)}
            onRemoveLabel={(label) => cards.onRemoveLabel(task.id, label)}
            labelInputValue={cards.labelInput[task.id] ?? ""}
            onLabelInputChange={(v) => cards.onLabelInputChange(task.id, v)}
            onDragStart={(e) => cards.onDragStart(task.id, e)}
            onDragEnd={cards.onDragEnd}
          />
        ))}
      </ul>

      <AddTaskInput {...addTask} />
    </section>
  );
}
