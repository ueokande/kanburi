import { expect, it } from "vitest";
import type { Task } from "./types";
import {
  parseSearchQuery,
  searchCompletion,
  taskMatchesFilters,
} from "./taskFilters";
const now = new Date(2026, 10, 3, 23, 30);
const task: Task = {
  id: "one",
  text: "Fix login",
  description: "Expired session",
  labels: ["Backend", "Bug"],
  status: "todo",
  column: "Todo",
};
it.each([
  ["overdue", "2026-11-02", true],
  ["overdue", "2026-11-03", false],
  ["today", "2026-11-03", true],
  ["today", "2026-11-04", false],
  ["tomorrow", "2026-11-04", true],
  ["tomorrow", "2026-11-03", false],
  ["week", "2026-11-03", true],
  ["week", "2026-11-09", true],
  ["week", "2026-11-10", false],
  ["week", "2026-11-02", false],
  ["none", undefined, true],
  ["none", "2026-11-03", false],
  ["today", undefined, false],
  ["overdue", undefined, false],
  ["week", undefined, false],
  ["2026-11-03", "2026-11-03", true],
  ["2026-11-03", "2026-11-04", false],
] as const)("matches due:%s for %s: %s", (due, due_date, expected) => {
  expect(
    taskMatchesFilters(
      { ...task, due_date },
      parseSearchQuery(`due:${due}`),
      now,
    ),
  ).toBe(expected);
});
it("combines free words across fields, exact labels, and due conditions with AND", () => {
  const dated = { ...task, due_date: "2026-11-03" };
  expect(
    taskMatchesFilters(
      dated,
      parseSearchQuery(" LOGIN session #Backend #Bug due:today"),
      now,
    ),
  ).toBe(true);
  for (const query of [
    "#Back",
    "#backend",
    "login absent",
    "#Backend due:none",
    "due:today due:tomorrow",
  ])
    expect(taskMatchesFilters(dated, parseSearchQuery(query), now)).toBe(false);
});
it.each([
  "due:",
  "due:nope",
  "due:2026-02-30",
  "due:2026-13-01",
])("reports invalid deadlines instead of silently dropping them: %s", (query) => {
  expect(parseSearchQuery(query).errors).toHaveLength(1);
  expect(taskMatchesFilters(task, parseSearchQuery(query), now)).toBe(false);
});
it("handles whitespace, Japanese tags, and incomplete tag entry", () => {
  expect(taskMatchesFilters(task, parseSearchQuery("   "), now)).toBe(true);
  expect(parseSearchQuery("#日本語 due:TODAY")).toMatchObject({
    labels: ["日本語"],
    dueDates: ["today"],
  });
  expect(parseSearchQuery("#").labels).toEqual([]);
});
it("uses calendar dates across year and DST boundaries", () => {
  expect(
    taskMatchesFilters(
      { ...task, due_date: "2027-01-03" },
      parseSearchQuery("due:week"),
      new Date(2026, 11, 29),
    ),
  ).toBe(true);
  expect(
    taskMatchesFilters(
      { ...task, due_date: "2026-11-03" },
      parseSearchQuery("due:week"),
      new Date(2026, 9, 29),
    ),
  ).toBe(true);
});
it("finds the token at the cursor and preserves its full replacement range", () => {
  const value = "fix #BackEnd due:today";
  expect(searchCompletion(value, 7, ["Backend", "Bug"], now)).toMatchObject({
    start: 4,
    end: 12,
    options: [{ value: "#Backend" }],
  });
  expect(
    searchCompletion("hello ", 6, ["Backend"], now)?.options.map(
      (option) => option.value,
    ),
  ).toEqual(["#", "due:"]);
  expect(
    searchCompletion("due:to", 6, [], now)?.options.map((o) => o.value),
  ).toEqual(["due:today", "due:tomorrow"]);
});
