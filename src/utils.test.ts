import { describe, expect, it } from "vitest";
import { LABEL_PALETTE } from "./types";
import {
  buildMovedTaskList,
  formatDueDate,
  isOverdue,
  labelStyle,
  nextStatus,
  parseTaskInput,
} from "./utils";

describe("labelStyle", () => {
  it("returns a palette entry", () => {
    const style = labelStyle("test");
    expect(LABEL_PALETTE).toContainEqual(style);
  });

  it("is deterministic for the same label", () => {
    expect(labelStyle("foo")).toEqual(labelStyle("foo"));
  });

  it("returns an object with bg and text fields", () => {
    const style = labelStyle("Personal");
    expect(style).toHaveProperty("bg");
    expect(style).toHaveProperty("text");
  });

  it("hashes differently labelled strings into the palette range", () => {
    const style = labelStyle(
      "a very long label string that has many characters",
    );
    expect(LABEL_PALETTE).toContainEqual(style);
  });
});

describe("parseTaskInput", () => {
  it("parses plain text", () => {
    expect(parseTaskInput("Buy milk")).toEqual({
      text: "Buy milk",
      labels: [],
      due_date: undefined,
    });
  });

  it("parses a single label", () => {
    expect(parseTaskInput("Buy milk #Personal")).toEqual({
      text: "Buy milk",
      labels: ["Personal"],
      due_date: undefined,
    });
  });

  it("parses multiple labels", () => {
    expect(parseTaskInput("Buy milk #Personal #Shopping")).toEqual({
      text: "Buy milk",
      labels: ["Personal", "Shopping"],
      due_date: undefined,
    });
  });

  it("parses a due date", () => {
    expect(parseTaskInput("Buy milk @2026-03-30")).toEqual({
      text: "Buy milk",
      labels: [],
      due_date: "2026-03-30",
    });
  });

  it("parses labels and due date together", () => {
    expect(parseTaskInput("Buy milk #Personal @2026-03-30")).toEqual({
      text: "Buy milk",
      labels: ["Personal"],
      due_date: "2026-03-30",
    });
  });

  it("trims leading and trailing whitespace", () => {
    expect(parseTaskInput("  Buy milk  ").text).toBe("Buy milk");
  });

  it("returns empty text when input is only tokens", () => {
    expect(parseTaskInput("#label @2026-01-01").text).toBe("");
  });

  it("ignores a bare # with no label text", () => {
    expect(parseTaskInput("task # end").labels).toEqual([]);
  });
});

describe("nextStatus", () => {
  it("toggles todo to done", () => {
    expect(nextStatus("todo")).toBe("done");
  });

  it("toggles done back to todo", () => {
    expect(nextStatus("done")).toBe("todo");
  });
});

// helpers
function task(
  id: string,
  column: string,
  overrides: Partial<import("./types").Task> = {},
): import("./types").Task {
  return { id, text: id, status: "todo", column, labels: [], ...overrides };
}

describe("buildMovedTaskList", () => {
  it("removes task from its original position", () => {
    const tasks = [task("a", "Col1"), task("b", "Col1"), task("c", "Col2")];
    // Pass moved task with its column already updated (as the reducer does)
    const movedTask = { ...tasks[0], column: "Col2" };
    const result = buildMovedTaskList(tasks, movedTask, "Col2", 0);
    expect(result.filter((t) => t.column === "Col1").map((t) => t.id)).toEqual([
      "b",
    ]);
  });

  it("inserts task at index 0 in the target column", () => {
    const tasks = [task("a", "Col1"), task("b", "Col2"), task("c", "Col2")];
    const movedTask = { ...tasks[0], column: "Col2" };
    const result = buildMovedTaskList(tasks, movedTask, "Col2", 0);
    const col2 = result.filter((t) => t.column === "Col2").map((t) => t.id);
    expect(col2[0]).toBe("a");
  });

  it("inserts task at the end when index equals column length", () => {
    const tasks = [task("a", "Col1"), task("b", "Col2"), task("c", "Col2")];
    const movedTask = { ...tasks[0], column: "Col2" };
    const result = buildMovedTaskList(tasks, movedTask, "Col2", 2);
    const col2 = result.filter((t) => t.column === "Col2").map((t) => t.id);
    expect(col2[col2.length - 1]).toBe("a");
  });

  it("clamps insertIndex beyond column length to the end", () => {
    const tasks = [task("a", "Col1"), task("b", "Col2")];
    const movedTask = { ...tasks[0], column: "Col2" };
    const result = buildMovedTaskList(tasks, movedTask, "Col2", 999);
    const col2 = result.filter((t) => t.column === "Col2").map((t) => t.id);
    expect(col2[col2.length - 1]).toBe("a");
  });

  it("moves task within the same column (reorder)", () => {
    const tasks = [task("a", "Col1"), task("b", "Col1"), task("c", "Col1")];
    const result = buildMovedTaskList(tasks, tasks[2], "Col1", 0);
    const col1 = result.filter((t) => t.column === "Col1").map((t) => t.id);
    expect(col1[0]).toBe("c");
  });

  it("appends to an empty target column", () => {
    const tasks = [task("a", "Col1")];
    const result = buildMovedTaskList(tasks, tasks[0], "Col2", 0);
    expect(result.find((t) => t.id === "a")).toBeDefined();
  });
});

describe("formatDueDate", () => {
  it("includes the year for dates in a past year", () => {
    expect(formatDueDate("2020-01-15")).toContain("2020");
  });

  it("includes the abbreviated month name", () => {
    expect(formatDueDate("2020-06-15")).toMatch(/Jun/i);
  });

  it("includes the day number", () => {
    expect(formatDueDate("2020-06-15")).toContain("15");
  });
});

describe("isOverdue", () => {
  it("returns false when due_date is undefined", () => {
    expect(isOverdue(undefined)).toBe(false);
  });

  it("returns true for a clearly past date", () => {
    expect(isOverdue("2020-01-01")).toBe(true);
  });

  it("returns false for a far future date", () => {
    expect(isOverdue("2099-12-31")).toBe(false);
  });
});
