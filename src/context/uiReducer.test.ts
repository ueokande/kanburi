import { describe, expect, it } from "vitest";
import type { UIState } from "./uiReducer";
import { initialUIState, uiReducer } from "./uiReducer";

function state(overrides: Partial<UIState> = {}): UIState {
  return { ...initialUIState, ...overrides };
}

describe("TOGGLE_EXPAND", () => {
  it("expands a card when none is expanded", () => {
    const next = uiReducer(state(), { type: "TOGGLE_EXPAND", id: "t1" });
    expect(next.expandedId).toBe("t1");
  });

  it("collapses a card when it is already expanded", () => {
    const next = uiReducer(state({ expandedId: "t1" }), {
      type: "TOGGLE_EXPAND",
      id: "t1",
    });
    expect(next.expandedId).toBeNull();
  });

  it("switches to a different card when another is expanded", () => {
    const next = uiReducer(state({ expandedId: "t1" }), {
      type: "TOGGLE_EXPAND",
      id: "t2",
    });
    expect(next.expandedId).toBe("t2");
  });
});

describe("CLEAR_EXPAND_IF_MATCH", () => {
  it("clears expandedId when it matches", () => {
    const next = uiReducer(state({ expandedId: "t1" }), {
      type: "CLEAR_EXPAND_IF_MATCH",
      id: "t1",
    });
    expect(next.expandedId).toBeNull();
  });

  it("leaves expandedId unchanged when it does not match", () => {
    const next = uiReducer(state({ expandedId: "t1" }), {
      type: "CLEAR_EXPAND_IF_MATCH",
      id: "t2",
    });
    expect(next.expandedId).toBe("t1");
  });

  it("is a no-op when nothing is expanded", () => {
    const next = uiReducer(state(), {
      type: "CLEAR_EXPAND_IF_MATCH",
      id: "t1",
    });
    expect(next.expandedId).toBeNull();
  });
});

describe("START_RENAME_COLUMN", () => {
  it("sets editingColumn and editingName to the given name", () => {
    const next = uiReducer(state(), {
      type: "START_RENAME_COLUMN",
      name: "Todo",
    });
    expect(next.editingColumn).toBe("Todo");
    expect(next.editingName).toBe("Todo");
  });

  it("overwrites a previous rename in progress", () => {
    const s = state({ editingColumn: "Old", editingName: "Old" });
    const next = uiReducer(s, { type: "START_RENAME_COLUMN", name: "New" });
    expect(next.editingColumn).toBe("New");
    expect(next.editingName).toBe("New");
  });
});

describe("SET_EDITING_NAME", () => {
  it("updates the editingName without touching editingColumn", () => {
    const s = state({ editingColumn: "Todo", editingName: "Todo" });
    const next = uiReducer(s, { type: "SET_EDITING_NAME", name: "Backlog" });
    expect(next.editingName).toBe("Backlog");
    expect(next.editingColumn).toBe("Todo");
  });
});

describe("CANCEL_RENAME_COLUMN", () => {
  it("clears both editingColumn and editingName", () => {
    const s = state({ editingColumn: "Todo", editingName: "Backlog" });
    const next = uiReducer(s, { type: "CANCEL_RENAME_COLUMN" });
    expect(next.editingColumn).toBeNull();
    expect(next.editingName).toBe("");
  });
});

describe("CLEAR_EDITING_COLUMN", () => {
  it("clears both editingColumn and editingName (same as CANCEL)", () => {
    const s = state({ editingColumn: "Todo", editingName: "Backlog" });
    const next = uiReducer(s, { type: "CLEAR_EDITING_COLUMN" });
    expect(next.editingColumn).toBeNull();
    expect(next.editingName).toBe("");
  });
});

describe("SET_NEW_TASK_TEXT", () => {
  it("stores text keyed by column name", () => {
    const next = uiReducer(state(), {
      type: "SET_NEW_TASK_TEXT",
      column: "Todo",
      text: "New task",
    });
    expect(next.newTaskText.Todo).toBe("New task");
  });

  it("updates an existing entry for the same column", () => {
    const s = state({ newTaskText: { Todo: "old text" } });
    const next = uiReducer(s, {
      type: "SET_NEW_TASK_TEXT",
      column: "Todo",
      text: "new text",
    });
    expect(next.newTaskText.Todo).toBe("new text");
  });

  it("preserves entries for other columns", () => {
    const s = state({ newTaskText: { Done: "keep me" } });
    const next = uiReducer(s, {
      type: "SET_NEW_TASK_TEXT",
      column: "Todo",
      text: "hi",
    });
    expect(next.newTaskText.Done).toBe("keep me");
  });
});
