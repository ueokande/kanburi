import { expect, it } from "vitest";
import type { Task } from "./types";
import { emptyTaskFilters, taskMatchesFilters } from "./taskFilters";
const now = new Date(2026, 10, 3, 23, 30);
const task: Task = {
  id: "one",
  text: "Fix login",
  description: "Expired session",
  labels: ["Backend"],
  status: "todo",
  column: "Todo",
};
it.each([
  ["overdue", "2026-11-02", true],
  ["overdue", "2026-11-03", false],
  ["today", "2026-11-03", true],
  ["today", "2026-11-04", false],
  ["week", "2026-11-03", true],
  ["week", "2026-11-09", true],
  ["week", "2026-11-10", false],
  ["week", "2026-11-02", false],
  ["none", undefined, true],
  ["none", "2026-11-03", false],
  ["today", undefined, false],
  ["overdue", undefined, false],
  ["week", undefined, false],
] as const)("matches %s for %s: %s", (due, due_date, expected) => {
  expect(
    taskMatchesFilters(
      { ...task, due_date },
      { ...emptyTaskFilters, due },
      now,
    ),
  ).toBe(expected);
});
it("combines text, exact label and due date conditions", () => {
  const filters = {
    query: " SESSION ",
    label: "Backend",
    due: "today",
  } as const;
  const dated = { ...task, due_date: "2026-11-03" };
  expect(taskMatchesFilters(dated, filters, now)).toBe(true);
  expect(taskMatchesFilters(dated, { ...filters, label: "Back" }, now)).toBe(
    false,
  );
  expect(taskMatchesFilters(dated, { ...filters, query: "absent" }, now)).toBe(
    false,
  );
  expect(taskMatchesFilters(dated, { ...filters, due: "overdue" }, now)).toBe(
    false,
  );
});
it("uses calendar dates across month/year and DST boundaries", () => {
  expect(
    taskMatchesFilters(
      { ...task, due_date: "2027-01-03" },
      { ...emptyTaskFilters, due: "week" },
      new Date(2026, 11, 29),
    ),
  ).toBe(true);
  expect(
    taskMatchesFilters(
      { ...task, due_date: "2026-11-03" },
      { ...emptyTaskFilters, due: "week" },
      new Date(2026, 9, 29),
    ),
  ).toBe(true);
});
