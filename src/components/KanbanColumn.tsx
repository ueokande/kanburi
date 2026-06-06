import { useKanbanState } from "../context/BoardContext";
import { useAddTask } from "../hooks/useAddTask";
import { useColumns } from "../hooks/useColumns";
import { useDragDrop } from "../hooks/useDragDrop";
import { useTaskExpand } from "../hooks/useTaskExpand";
import { useTaskMutations } from "../hooks/useTaskMutations";
import { AddTaskInput } from "./AddTaskInput";
import { ColumnHeader } from "./ColumnHeader";
import { KanbanCard } from "./KanbanCard";
import styles from "./KanbanColumn.module.css";

interface Props {
  columnName: string;
}

export function KanbanColumn({ columnName }: Props) {
  const { board } = useKanbanState();
  const columns = useColumns();
  const add = useAddTask();
  const mutations = useTaskMutations();
  const expand = useTaskExpand();
  const dnd = useDragDrop();

  const tasks = board.tasks.filter((t) => t.column === columnName);

  async function handleDeleteTask(id: string) {
    expand.clearIfMatch(id);
    await mutations.deleteTask(id);
  }

  return (
    <section
      className={styles.column}
      aria-label={columnName}
      data-column={columnName}
      onDragOver={dnd.onDragOver}
      onDrop={(e) => dnd.onDrop(e, columnName)}
    >
      <ColumnHeader
        name={columnName}
        taskCount={tasks.length}
        isEditing={columns.editingColumn === columnName}
        editingName={columns.editingName}
        onEditingNameChange={columns.setEditingName}
        onStartRename={() => columns.startRename(columnName)}
        onCommitRename={() => columns.commitRename(columnName)}
        onCancelRename={columns.cancelRename}
        renameInputRef={columns.renameInputRef}
        onDelete={() => columns.deleteColumn(columnName)}
        onSortByDueDate={() => mutations.sortColumnByDueDate(columnName)}
      />

      <ul className={styles.cardList} data-card-list>
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            isExpanded={expand.expandedId === task.id}
            onToggleExpand={() => expand.toggleExpand(task.id)}
            onUpdate={(patch) => mutations.updateTask(task.id, patch)}
            onDelete={() => handleDeleteTask(task.id)}
            onAddLabel={(label) => mutations.addLabel(task.id, label)}
            onRemoveLabel={(label) => mutations.removeLabel(task.id, label)}
            onDragStart={(e) => dnd.onDragStart(task.id, e)}
            onDragEnd={dnd.onDragEnd}
          />
        ))}
      </ul>

      <AddTaskInput
        value={add.newTaskText[columnName] ?? ""}
        onChange={(v) => add.setNewTaskText((p) => ({ ...p, [columnName]: v }))}
        onAdd={() => add.addTask(columnName)}
      />
    </section>
  );
}
