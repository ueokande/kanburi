import { describe, expect, it, vi } from "vitest";

// Tauri APIs are unavailable in Node.js test environment; mock them so
// the module-level imports in useBoard.ts do not throw.
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("../context/BoardContext", () => ({
  useKanbanState: vi.fn(),
  useKanbanDispatch: vi.fn(),
}));

import { statusForColumn } from "../hooks/useBoard";

describe("statusForColumn", () => {
  const cols = ["Todo", "In Progress", "Done"];

  it("returns todo for the first column", () => {
    expect(statusForColumn(cols, "Todo")).toBe("todo");
  });

  it("returns done for the last column", () => {
    expect(statusForColumn(cols, "Done")).toBe("done");
  });

  it("returns todo for a middle column", () => {
    expect(statusForColumn(cols, "In Progress")).toBe("todo");
  });

  it("returns todo for a two-column list — first column", () => {
    expect(statusForColumn(["Backlog", "Released"], "Backlog")).toBe("todo");
  });

  it("returns done for a two-column list — last column", () => {
    expect(statusForColumn(["Backlog", "Released"], "Released")).toBe("done");
  });

  it("returns todo for a single-column list (first check wins)", () => {
    expect(statusForColumn(["Only"], "Only")).toBe("todo");
  });

  it("returns todo for a column name not in the list", () => {
    // indexOf returns -1; neither first nor last check matches
    expect(statusForColumn(cols, "Unknown")).toBe("todo");
  });
});
