import type { Status } from "../types";
import { useBoardStore } from "./useBoardStore";
import { useColumns } from "./useColumns";
import { useDragDrop } from "./useDragDrop";
import { useTasks } from "./useTasks";

function statusForColumn(colNames: string[], colName: string): Status {
  const idx = colNames.indexOf(colName);
  const total = colNames.length;
  if (idx === 0) return "todo";
  if (idx === total - 1) return "done";
  return "in_progress";
}

export function useBoard() {
  const { board, filePath, isLoading, openFile, loadFromPath, saveBoard } =
    useBoardStore();

  const colNames = board.columns.map((c) => c.name);
  const getStatus = (colName: string) => statusForColumn(colNames, colName);

  const tasks = useTasks(board, saveBoard, getStatus);
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
