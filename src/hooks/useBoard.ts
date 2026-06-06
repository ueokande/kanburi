import type { Status } from "../types";
import { useAddTask } from "./useAddTask";
import { useBoardStore } from "./useBoardStore";
import { useColumns } from "./useColumns";
import { useDragDrop } from "./useDragDrop";
import { useTaskExpand } from "./useTaskExpand";
import { useTaskMutations } from "./useTaskMutations";

function statusForColumn(colNames: string[], colName: string): Status {
  const idx = colNames.indexOf(colName);
  const total = colNames.length;
  if (idx === 0) return "todo";
  if (idx === total - 1) return "done";
  return "todo";
}

export function useBoard() {
  const { board, filePath, isLoading, openFile, loadFromPath, saveBoard } =
    useBoardStore();

  const colNames = board.columns.map((c) => c.name);
  const getStatus = (colName: string) => statusForColumn(colNames, colName);

  const expand = useTaskExpand();
  const add = useAddTask(board, saveBoard, getStatus);
  const mutations = useTaskMutations(board, saveBoard, getStatus);

  async function deleteTask(id: string) {
    expand.clearIfMatch(id);
    await mutations.deleteTask(id);
  }

  const tasks = {
    expandedId: expand.expandedId,
    toggleExpand: expand.toggleExpand,
    newTaskText: add.newTaskText,
    setNewTaskText: add.setNewTaskText,
    addTask: add.addTask,
    updateTask: mutations.updateTask,
    moveTask: mutations.moveTask,
    deleteTask,
    addLabel: mutations.addLabel,
    removeLabel: mutations.removeLabel,
    sortColumnByDueDate: mutations.sortColumnByDueDate,
  };

  const columns = useColumns(board, saveBoard);
  const dnd = useDragDrop(board, tasks.moveTask, getStatus);

  return {
    board,
    filePath,
    isLoading,
    openFile,
    loadFromPath,
    tasks,
    columns,
    dnd,
  };
}
