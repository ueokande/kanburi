// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { BoardProvider } from "../context/BoardContext";
import type { Board } from "../types";
import { FileBoard } from "./FileBoard";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ confirm: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const board: Board = {
  columns: [{ name: "Todo" }, { name: "Done" }],
  tasks: [
    {
      id: "one",
      text: "Fix login",
      description: "Handle expired SESSION",
      labels: ["Backend"],
      column: "Todo",
      status: "todo",
    },
    {
      id: "two",
      text: "Write docs",
      labels: ["Guide"],
      column: "Done",
      status: "done",
    },
  ],
};
function setup() {
  render(
    <BoardProvider
      initialState={{ board, filePath: "/test.md", isLoading: false }}
    >
      <FileBoard onTitleChange={() => {}} />
    </BoardProvider>,
  );
  expect(screen.queryByRole("combobox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  return screen.getByRole("combobox", { name: "Search tasks" });
}
it.each([
  " LOGIN ",
  "session",
  "BACKEND",
])("searches title, description and labels without saving: %s", (query) => {
  const search = setup();
  fireEvent.change(search, { target: { value: query } });
  expect(screen.getByText("Fix login")).toBeTruthy();
  expect(screen.queryByText("Write docs")).toBeNull();
  expect(screen.getByText("1 of 2 tasks")).toBeTruthy();
  expect(screen.getByRole("region", { name: "Done" })).toBeTruthy();
  expect(invoke).not.toHaveBeenCalled();
});
it("reports no matches and restores all cards via clear or Escape", () => {
  const search = setup();
  fireEvent.change(search, { target: { value: "absent" } });
  expect(screen.getByText("No tasks match your filters.")).toBeTruthy();
  expect(screen.queryByText("Fix login")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(document.activeElement).toBe(search);
  expect(screen.getByText("Write docs")).toBeTruthy();
  fireEvent.change(search, { target: { value: "login" } });
  fireEvent.keyDown(search, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByText("Write docs")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Search/ }));
  expect(screen.getByRole("combobox")).toBeTruthy();
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "   " } });
  expect(screen.getByText("Fix login")).toBeTruthy();
});
it("preserves hidden tasks when saving a filtered board", async () => {
  const search = setup();
  fireEvent.change(search, { target: { value: "login" } });
  fireEvent.click(screen.getByRole("button", { name: "+ Add column" }));
  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith(
      "save_current_board",
      expect.objectContaining({
        board: expect.objectContaining({ tasks: board.tasks }),
      }),
    ),
  );
});

it("combines label and due tokens and keeps the query when collapsed", () => {
  const input = setup();
  fireEvent.change(input, { target: { value: "#Backend due:none " } });
  expect(screen.getByText("1 of 2 tasks")).toBeTruthy();
  expect(screen.queryByText("Write docs")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Hide search" }));
  expect(screen.queryByRole("combobox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Search (active)" }));
  expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe(
    "#Backend due:none ",
  );
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByText("Write docs")).toBeTruthy();
  expect(invoke).not.toHaveBeenCalled();
});
it("completes existing labels and due values with the keyboard", () => {
  const input = setup();
  fireEvent.change(input, {
    target: { value: "#ba", selectionStart: 3, selectionEnd: 3 },
  });
  fireEvent.keyDown(input, { key: "Enter" });
  expect((input as HTMLInputElement).value).toBe("#Backend ");
  fireEvent.change(input, {
    target: { value: "#Backend due:to", selectionStart: 15, selectionEnd: 15 },
  });
  expect(screen.getByRole("option", { name: /due:today/ })).toBeTruthy();
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Tab" });
  expect((input as HTMLInputElement).value).toBe("#Backend due:tomorrow ");
});
it("does not complete tokens while an IME is composing", () => {
  const input = setup();
  fireEvent.compositionStart(input);
  fireEvent.change(input, {
    target: { value: "#Ba", selectionStart: 3, selectionEnd: 3 },
  });
  fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });
  expect((input as HTMLInputElement).value).toBe("#Ba");
  fireEvent.compositionEnd(input);
});

it("replaces the token at the cursor without losing surrounding terms", () => {
  const input = setup();
  fireEvent.change(input, {
    target: { value: "login #Ba due:none", selectionStart: 9, selectionEnd: 9 },
  });
  fireEvent.click(screen.getByRole("option", { name: /#Backend/ }));
  expect((input as HTMLInputElement).value).toBe("login #Backend due:none");
  expect(screen.getByText("Fix login")).toBeTruthy();
});
it("dismisses suggestions before collapsing the search and reports invalid deadlines", () => {
  const input = setup();
  fireEvent.change(input, {
    target: { value: "#", selectionStart: 1, selectionEnd: 1 },
  });
  expect(screen.getByRole("listbox")).toBeTruthy();
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
  expect(screen.getByRole("combobox")).toBeTruthy();
  fireEvent.change(input, { target: { value: "due:2026-02-30" } });
  expect(screen.getByText(/Invalid deadline/)).toBeTruthy();
  expect(screen.queryByText("Fix login")).toBeNull();
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("combobox")).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Search (active)" }),
  );
});

it("offers qualifiers on empty input and continues directly to values", () => {
  const input = setup();
  expect(screen.queryByText(/Select · Enter/)).toBeNull();
  expect(screen.queryByText(/Text · #label/)).toBeNull();
  fireEvent.click(screen.getByRole("option", { name: "# Label" }));
  expect((input as HTMLInputElement).value).toBe("#");
  expect(screen.getByRole("option", { name: /#Backend/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("option", { name: /#Backend/ }));
  expect((input as HTMLInputElement).value).toBe("#Backend ");
  fireEvent.change(input, {
    target: { value: "#Backend d", selectionStart: 10, selectionEnd: 10 },
  });
  expect(screen.getAllByRole("option")).toHaveLength(1);
  fireEvent.keyDown(input, { key: "Enter" });
  expect((input as HTMLInputElement).value).toBe("#Backend due:");
  expect(screen.getByRole("option", { name: /due:today/ })).toBeTruthy();
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Tab" });
  expect((input as HTMLInputElement).value).toBe("#Backend due:today ");
});
it("offers qualifiers after whitespace and dismisses them without changing free text", () => {
  const input = setup();
  fireEvent.change(input, {
    target: { value: "login ", selectionStart: 6, selectionEnd: 6 },
  });
  expect(screen.getByRole("option", { name: "due: Due date" })).toBeTruthy();
  fireEvent.keyDown(input, { key: "Escape" });
  expect(screen.queryByRole("listbox")).toBeNull();
  expect((input as HTMLInputElement).value).toBe("login ");
  expect(screen.getByText("Fix login")).toBeTruthy();
});

it.each([
  " ",
  "login ",
  "#Backend ",
  "due:today ",
  "login #Backend due:today ",
])("offers the next qualifier after a manually typed space: %s", (value) => {
  const input = setup();
  fireEvent.change(input, {
    target: { value, selectionStart: value.length, selectionEnd: value.length },
  });
  expect(screen.getByRole("option", { name: "# Label" })).toBeTruthy();
  expect(screen.getByRole("option", { name: "due: Due date" })).toBeTruthy();
});
it("continues from completed label and due values to the next qualifier", () => {
  const input = setup();
  fireEvent.click(screen.getByRole("option", { name: "# Label" }));
  fireEvent.click(screen.getByRole("option", { name: /#Backend/ }));
  expect((input as HTMLInputElement).value).toBe("#Backend ");
  fireEvent.click(screen.getByRole("option", { name: "due: Due date" }));
  expect((input as HTMLInputElement).value).toBe("#Backend due:");
  fireEvent.click(screen.getByRole("option", { name: /due:today/ }));
  expect((input as HTMLInputElement).value).toBe("#Backend due:today ");
  expect(screen.getByRole("option", { name: "# Label" })).toBeTruthy();
  expect(screen.getByRole("option", { name: "due: Due date" })).toBeTruthy();
});
it("restores suggestions when reopening an empty search after dismissing them", () => {
  setup();
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(screen.getByRole("option", { name: "# Label" })).toBeTruthy();
});
