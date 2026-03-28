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
  onDragStart: (taskId: string) => void;
}

interface Props {
  tasks: Task[];
  header: ColumnHeaderProps;
  addTask: AddTaskInputProps;
  cards: CardListProps;
  onDrop: () => void;
}

export function KanbanColumn({ tasks, header, addTask, cards, onDrop }: Props) {
  return (
    <section
      className={styles.column}
      aria-label={header.name}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <ColumnHeader {...header} />

      <ul className={styles.cardList}>
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
            onDragStart={() => cards.onDragStart(task.id)}
          />
        ))}
      </ul>

      <AddTaskInput {...addTask} />
    </section>
  );
}
