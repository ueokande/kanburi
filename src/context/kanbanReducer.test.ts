import { describe, expect, it } from "vitest";
import type { Board, Task } from "../types";
import type { KanbanState } from "./kanbanReducer";
import { initialKanbanState, kanbanReducer } from "./kanbanReducer";

function task(id: string, column: string, overrides: Partial<Task> = {}): Task {
  return { id, text: id, status: "todo", column, labels: [], ...overrides };
}

function stateWith(
  board: Partial<Board>,
  overrides: Partial<KanbanState> = {},
): KanbanState {
  return {
    ...initialKanbanState,
    board: { columns: [], tasks: [], ...board },
    ...overrides,
  };
}

describe("LOAD_START", () => {
  it("sets isLoading to true", () => {
    const next = kanbanReducer(initialKanbanState, { type: "LOAD_START" });
    expect(next.isLoading).toBe(true);
  });

  it("preserves existing board state while loading", () => {
    const state = stateWith({ columns: [{ name: "Todo" }] });
    const next = kanbanReducer(state, { type: "LOAD_START" });
    expect(next.board.columns).toHaveLength(1);
  });
});

describe("LOAD_SUCCESS", () => {
  const board: Board = {
    columns: [{ name: "Todo" }, { name: "Done" }],
    tasks: [task("t1", "Todo")],
  };

  it("stores the loaded board", () => {
    const next = kanbanReducer(initialKanbanState, {
      type: "LOAD_SUCCESS",
      board,
      filePath: "/path/to/file.md",
    });
    expect(next.board).toEqual(board);
  });

  it("stores the filePath", () => {
    const next = kanbanReducer(initialKanbanState, {
      type: "LOAD_SUCCESS",
      board,
      filePath: "/path/to/file.md",
    });
    expect(next.filePath).toBe("/path/to/file.md");
  });

  it("sets isLoading to false", () => {
    const loading = { ...initialKanbanState, isLoading: true };
    const next = kanbanReducer(loading, {
      type: "LOAD_SUCCESS",
      board,
      filePath: "/f.md",
    });
    expect(next.isLoading).toBe(false);
  });

  it("replaces stale board data on reload", () => {
    const old = stateWith({ columns: [{ name: "Old" }] });
    const next = kanbanReducer(old, {
      type: "LOAD_SUCCESS",
      board,
      filePath: "/f.md",
    });
    expect(next.board.columns.map((c) => c.name)).not.toContain("Old");
  });
});

describe("ADD_TASK", () => {
  it("appends the task to the task list", () => {
    const state = stateWith({ tasks: [task("t1", "Todo")] });
    const t2 = task("t2", "Todo");
    const next = kanbanReducer(state, { type: "ADD_TASK", task: t2 });
    expect(next.board.tasks).toHaveLength(2);
    expect(next.board.tasks[1]).toEqual(t2);
  });

  it("does not mutate the previous state", () => {
    const state = stateWith({ tasks: [] });
    kanbanReducer(state, { type: "ADD_TASK", task: task("t1", "Todo") });
    expect(state.board.tasks).toHaveLength(0);
  });
});

describe("UPDATE_TASK", () => {
  it("applies a text patch to the matching task", () => {
    const state = stateWith({ tasks: [task("t1", "Todo")] });
    const next = kanbanReducer(state, {
      type: "UPDATE_TASK",
      id: "t1",
      patch: { text: "updated text" },
    });
    expect(next.board.tasks[0].text).toBe("updated text");
  });

  it("does not touch other tasks", () => {
    const state = stateWith({
      tasks: [task("t1", "Todo"), task("t2", "Done")],
    });
    const next = kanbanReducer(state, {
      type: "UPDATE_TASK",
      id: "t1",
      patch: { status: "done" },
    });
    // t2 was created with status "todo"; it must remain untouched
    expect(next.board.tasks[1].status).toBe("todo");
  });

  it("merges partial patch fields", () => {
    const t = task("t1", "Todo", { labels: ["A"], due_date: "2025-01-01" });
    const state = stateWith({ tasks: [t] });
    const next = kanbanReducer(state, {
      type: "UPDATE_TASK",
      id: "t1",
      patch: { due_date: "2025-12-31" },
    });
    expect(next.board.tasks[0].labels).toEqual(["A"]);
    expect(next.board.tasks[0].due_date).toBe("2025-12-31");
  });
});

describe("DELETE_TASK", () => {
  it("removes the task with the given id", () => {
    const state = stateWith({
      tasks: [task("t1", "Todo"), task("t2", "Todo")],
    });
    const next = kanbanReducer(state, { type: "DELETE_TASK", id: "t1" });
    expect(next.board.tasks.map((t) => t.id)).toEqual(["t2"]);
  });

  it("is a no-op when id does not exist", () => {
    const state = stateWith({ tasks: [task("t1", "Todo")] });
    const next = kanbanReducer(state, { type: "DELETE_TASK", id: "ghost" });
    expect(next.board.tasks).toHaveLength(1);
  });
});

describe("MOVE_TASK", () => {
  const cols = ["Todo", "In Progress", "Done"];
  const statusForCol = (col: string) =>
    col === "Done" ? ("done" as const) : ("todo" as const);

  it("moves a task to a different column", () => {
    const state = stateWith({
      columns: cols.map((n) => ({ name: n })),
      tasks: [task("t1", "Todo"), task("t2", "Done")],
    });
    const next = kanbanReducer(state, {
      type: "MOVE_TASK",
      id: "t1",
      targetColumn: "Done",
      insertIndex: 0,
      statusForColumn: statusForCol,
    });
    expect(next.board.tasks.find((t) => t.id === "t1")?.column).toBe("Done");
  });

  it("updates the task status to match target column", () => {
    const state = stateWith({
      columns: cols.map((n) => ({ name: n })),
      tasks: [task("t1", "Todo")],
    });
    const next = kanbanReducer(state, {
      type: "MOVE_TASK",
      id: "t1",
      targetColumn: "Done",
      insertIndex: 0,
      statusForColumn: statusForCol,
    });
    expect(next.board.tasks.find((t) => t.id === "t1")?.status).toBe("done");
  });

  it("keeps status when reordering within same column", () => {
    const state = stateWith({
      columns: cols.map((n) => ({ name: n })),
      tasks: [task("t1", "Todo"), task("t2", "Todo")],
    });
    const next = kanbanReducer(state, {
      type: "MOVE_TASK",
      id: "t1",
      targetColumn: "Todo",
      insertIndex: 1,
      statusForColumn: statusForCol,
    });
    expect(next.board.tasks.find((t) => t.id === "t1")?.status).toBe("todo");
  });

  it("is a no-op when task id does not exist", () => {
    const state = stateWith({ tasks: [task("t1", "Todo")] });
    const next = kanbanReducer(state, {
      type: "MOVE_TASK",
      id: "ghost",
      targetColumn: "Done",
      insertIndex: 0,
      statusForColumn: statusForCol,
    });
    expect(next).toBe(state);
  });
});

describe("ADD_COLUMN", () => {
  it("appends a new column", () => {
    const state = stateWith({ columns: [{ name: "Todo" }] });
    const next = kanbanReducer(state, { type: "ADD_COLUMN", name: "Done" });
    expect(next.board.columns.map((c) => c.name)).toEqual(["Todo", "Done"]);
  });

  it("does not affect existing tasks", () => {
    const state = stateWith({ columns: [], tasks: [task("t1", "Todo")] });
    const next = kanbanReducer(state, { type: "ADD_COLUMN", name: "New" });
    expect(next.board.tasks).toHaveLength(1);
  });
});

describe("RENAME_COLUMN", () => {
  it("renames the column", () => {
    const state = stateWith({ columns: [{ name: "Todo" }, { name: "Done" }] });
    const next = kanbanReducer(state, {
      type: "RENAME_COLUMN",
      oldName: "Todo",
      newName: "Backlog",
    });
    expect(next.board.columns.map((c) => c.name)).toContain("Backlog");
    expect(next.board.columns.map((c) => c.name)).not.toContain("Todo");
  });

  it("updates column references in tasks", () => {
    const state = stateWith({
      columns: [{ name: "Todo" }],
      tasks: [task("t1", "Todo"), task("t2", "Done")],
    });
    const next = kanbanReducer(state, {
      type: "RENAME_COLUMN",
      oldName: "Todo",
      newName: "Backlog",
    });
    expect(next.board.tasks.find((t) => t.id === "t1")?.column).toBe("Backlog");
    expect(next.board.tasks.find((t) => t.id === "t2")?.column).toBe("Done");
  });
});

describe("DELETE_COLUMN", () => {
  it("removes the column from the list", () => {
    const state = stateWith({
      columns: [{ name: "Todo" }, { name: "Done" }],
      tasks: [],
    });
    const next = kanbanReducer(state, { type: "DELETE_COLUMN", name: "Todo" });
    expect(next.board.columns.map((c) => c.name)).toEqual(["Done"]);
  });

  it("removes all tasks belonging to the deleted column", () => {
    const state = stateWith({
      columns: [{ name: "Todo" }, { name: "Done" }],
      tasks: [task("t1", "Todo"), task("t2", "Done")],
    });
    const next = kanbanReducer(state, { type: "DELETE_COLUMN", name: "Todo" });
    expect(next.board.tasks.map((t) => t.id)).toEqual(["t2"]);
  });
});

describe("SORT_COLUMN_BY_DUE_DATE", () => {
  it("sorts tasks with due dates ascending", () => {
    const state = stateWith({
      tasks: [
        task("t1", "Todo", { due_date: "2025-03-01" }),
        task("t2", "Todo", { due_date: "2025-01-01" }),
        task("t3", "Todo", { due_date: "2025-06-01" }),
      ],
    });
    const next = kanbanReducer(state, {
      type: "SORT_COLUMN_BY_DUE_DATE",
      column: "Todo",
    });
    const ids = next.board.tasks.map((t) => t.id);
    expect(ids).toEqual(["t2", "t1", "t3"]);
  });

  it("places tasks without due dates after those with due dates", () => {
    const state = stateWith({
      tasks: [
        task("t1", "Todo"),
        task("t2", "Todo", { due_date: "2025-01-01" }),
      ],
    });
    const next = kanbanReducer(state, {
      type: "SORT_COLUMN_BY_DUE_DATE",
      column: "Todo",
    });
    const ids = next.board.tasks.map((t) => t.id);
    expect(ids).toEqual(["t2", "t1"]);
  });

  it("does not affect tasks in other columns", () => {
    const state = stateWith({
      tasks: [
        task("t1", "Todo", { due_date: "2025-03-01" }),
        task("t2", "Done", { due_date: "2025-01-01" }),
      ],
    });
    const next = kanbanReducer(state, {
      type: "SORT_COLUMN_BY_DUE_DATE",
      column: "Todo",
    });
    const doneTask = next.board.tasks.find((t) => t.id === "t2");
    expect(doneTask?.column).toBe("Done");
  });
});

describe("ADD_LABEL", () => {
  it("adds a label to the task", () => {
    const state = stateWith({ tasks: [task("t1", "Todo")] });
    const next = kanbanReducer(state, {
      type: "ADD_LABEL",
      taskId: "t1",
      label: "Bug",
    });
    expect(next.board.tasks[0].labels).toContain("Bug");
  });

  it("does not add a duplicate label", () => {
    const state = stateWith({
      tasks: [task("t1", "Todo", { labels: ["Bug"] })],
    });
    const next = kanbanReducer(state, {
      type: "ADD_LABEL",
      taskId: "t1",
      label: "Bug",
    });
    expect(next.board.tasks[0].labels).toHaveLength(1);
  });

  it("is a no-op for an unknown task id", () => {
    const state = stateWith({ tasks: [task("t1", "Todo")] });
    const next = kanbanReducer(state, {
      type: "ADD_LABEL",
      taskId: "ghost",
      label: "Bug",
    });
    expect(next).toBe(state);
  });
});

describe("REMOVE_LABEL", () => {
  it("removes an existing label from the task", () => {
    const state = stateWith({
      tasks: [task("t1", "Todo", { labels: ["Bug", "Feature"] })],
    });
    const next = kanbanReducer(state, {
      type: "REMOVE_LABEL",
      taskId: "t1",
      label: "Bug",
    });
    expect(next.board.tasks[0].labels).toEqual(["Feature"]);
  });

  it("is a no-op when label is not present", () => {
    const state = stateWith({
      tasks: [task("t1", "Todo", { labels: ["Feature"] })],
    });
    const next = kanbanReducer(state, {
      type: "REMOVE_LABEL",
      taskId: "t1",
      label: "Bug",
    });
    expect(next.board.tasks[0].labels).toEqual(["Feature"]);
  });
});

describe("LOAD_SUCCESS with multiple tabs", () => {
  const boardA: Board = { columns: [{ name: "Todo" }], tasks: [] };
  const boardB: Board = { columns: [{ name: "Done" }], tasks: [] };

  it("adds a new document for a newly opened file without dropping others", () => {
    const afterFirst = kanbanReducer(initialKanbanState, {
      type: "LOAD_SUCCESS",
      board: boardA,
      filePath: "/a.md",
    });
    const afterSecond = kanbanReducer(afterFirst, {
      type: "LOAD_SUCCESS",
      board: boardB,
      filePath: "/b.md",
    });

    expect(afterSecond.documents).toEqual([
      { filePath: "/a.md", board: boardA },
      { filePath: "/b.md", board: boardB },
    ]);
    expect(afterSecond.board).toEqual(boardB);
    expect(afterSecond.filePath).toBe("/b.md");
  });

  it("mutations (e.g. ADD_TASK) keep the active document in documents in sync", () => {
    const loaded = kanbanReducer(initialKanbanState, {
      type: "LOAD_SUCCESS",
      board: boardA,
      filePath: "/a.md",
    });
    const t: Task = task("t1", "Todo");
    const next = kanbanReducer(loaded, { type: "ADD_TASK", task: t });

    expect(next.documents).toEqual([{ filePath: "/a.md", board: next.board }]);
    expect(next.board.tasks).toEqual([t]);
  });
});

describe("SWITCH_TAB", () => {
  it("makes the target document's board/filePath active", () => {
    const state: KanbanState = {
      ...initialKanbanState,
      documents: [
        { filePath: "/a.md", board: { columns: [{ name: "A" }], tasks: [] } },
        { filePath: "/b.md", board: { columns: [{ name: "B" }], tasks: [] } },
      ],
      board: { columns: [{ name: "A" }], tasks: [] },
      filePath: "/a.md",
    };

    const next = kanbanReducer(state, {
      type: "SWITCH_TAB",
      filePath: "/b.md",
    });

    expect(next.filePath).toBe("/b.md");
    expect(next.board).toEqual({ columns: [{ name: "B" }], tasks: [] });
  });

  it("is a no-op when the target path isn't an open document", () => {
    const board: Board = { columns: [], tasks: [] };
    const state: KanbanState = {
      ...initialKanbanState,
      documents: [{ filePath: "/a.md", board }],
      board,
      filePath: "/a.md",
    };

    const next = kanbanReducer(state, {
      type: "SWITCH_TAB",
      filePath: "/missing.md",
    });

    expect(next).toBe(state);
  });
});

describe("CLOSE_TAB", () => {
  const docA = {
    filePath: "/a.md",
    board: { columns: [{ name: "A" }], tasks: [] },
  };
  const docB = {
    filePath: "/b.md",
    board: { columns: [{ name: "B" }], tasks: [] },
  };

  it("removes the closed document without changing the active tab if it wasn't active", () => {
    const state: KanbanState = {
      ...initialKanbanState,
      documents: [docA, docB],
      board: docA.board,
      filePath: "/a.md",
    };

    const next = kanbanReducer(state, { type: "CLOSE_TAB", filePath: "/b.md" });

    expect(next.documents).toEqual([docA]);
    expect(next.filePath).toBe("/a.md");
    expect(next.board).toEqual(docA.board);
  });

  it("switches to another open document when the active tab is closed", () => {
    const state: KanbanState = {
      ...initialKanbanState,
      documents: [docA, docB],
      board: docA.board,
      filePath: "/a.md",
    };

    const next = kanbanReducer(state, { type: "CLOSE_TAB", filePath: "/a.md" });

    expect(next.documents).toEqual([docB]);
    expect(next.filePath).toBe("/b.md");
    expect(next.board).toEqual(docB.board);
  });

  it("returns to the empty board when the last tab is closed", () => {
    const state: KanbanState = {
      ...initialKanbanState,
      documents: [docA],
      board: docA.board,
      filePath: "/a.md",
    };

    const next = kanbanReducer(state, { type: "CLOSE_TAB", filePath: "/a.md" });

    expect(next.documents).toEqual([]);
    expect(next.filePath).toBeNull();
    expect(next.board).toEqual({ columns: [], tasks: [] });
  });
});

describe("RESTORE_SESSION", () => {
  const docA = {
    filePath: "/a.md",
    board: { columns: [{ name: "A" }], tasks: [] },
  };
  const docB = {
    filePath: "/b.md",
    board: { columns: [{ name: "B" }], tasks: [] },
  };

  it("restores documents and activates the requested path", () => {
    const next = kanbanReducer(initialKanbanState, {
      type: "RESTORE_SESSION",
      documents: [docA, docB],
      activeFilePath: "/b.md",
    });

    expect(next.documents).toEqual([docA, docB]);
    expect(next.filePath).toBe("/b.md");
    expect(next.board).toEqual(docB.board);
    expect(next.isLoading).toBe(false);
  });

  it("falls back to the first document when the active path isn't found", () => {
    const next = kanbanReducer(initialKanbanState, {
      type: "RESTORE_SESSION",
      documents: [docA, docB],
      activeFilePath: "/missing.md",
    });

    expect(next.filePath).toBe("/a.md");
  });

  it("restores an empty state when there are no documents to restore", () => {
    const next = kanbanReducer(initialKanbanState, {
      type: "RESTORE_SESSION",
      documents: [],
      activeFilePath: null,
    });

    expect(next.documents).toEqual([]);
    expect(next.filePath).toBeNull();
    expect(next.board).toEqual({ columns: [], tasks: [] });
  });
});
