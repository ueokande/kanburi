import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDueDate, isOverdue } from "./utils";

describe("calendar dates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats the specified calendar day", () => {
    expect(formatDueDate("2020-06-15")).toBe("Jun 15, 2020");
  });

  it("does not mark today overdue", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 12));
    expect(isOverdue("2026-06-15")).toBe(false);
    expect(isOverdue("2026-06-14")).toBe(true);
    expect(isOverdue("2026-06-16")).toBe(false);
  });
});
