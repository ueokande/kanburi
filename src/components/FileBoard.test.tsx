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
  expect(screen.queryByRole("searchbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Filter" }));
  return screen.getByRole("searchbox", { name: "Search tasks" });
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
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(document.activeElement).toBe(search);
  expect(screen.getByText("Write docs")).toBeTruthy();
  fireEvent.change(search, { target: { value: "login" } });
  fireEvent.keyDown(search, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.queryByText("Write docs")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
  expect(screen.getByRole("searchbox")).toBeTruthy();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "   " } });
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

it("combines label and due date filters and keeps them when dismissed", () => {
  setup();
  fireEvent.change(screen.getByRole("combobox", { name: "Label" }), {
    target: { value: "Backend" },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "Due date" }), {
    target: { value: "none" },
  });
  expect(screen.getByText("1 of 2 tasks")).toBeTruthy();
  expect(screen.queryByText("Write docs")).toBeNull();
  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: /2 active filters/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /Filter/ }));
  expect(
    (screen.getByRole("combobox", { name: "Label" }) as HTMLSelectElement)
      .value,
  ).toBe("Backend");
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getByText("Write docs")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /2 active filters/ })).toBeNull();
  expect(invoke).not.toHaveBeenCalled();
});
