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
  expect(screen.getByText("No tasks match your search.")).toBeTruthy();
  expect(screen.queryByText("Fix login")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
  expect(document.activeElement).toBe(search);
  expect(screen.getByText("Write docs")).toBeTruthy();
  fireEvent.change(search, { target: { value: "login" } });
  fireEvent.keyDown(search, { key: "Escape" });
  expect(screen.getByText("Write docs")).toBeTruthy();
  fireEvent.change(search, { target: { value: "   " } });
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
