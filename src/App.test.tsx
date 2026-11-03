// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";

const { invoke, open } = vi.hoisted(() => ({ invoke: vi.fn(), open: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open, confirm: vi.fn() }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({ onDragDropEvent: async () => () => {} }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  invoke.mockImplementation(async (command, args) => {
    if (command === "load_settings")
      return {
        restoreOnStartup: true,
        openFiles: ["/work.md", "/personal.md"],
        activeFile: "/work.md",
        sidebarCollapsed: false,
      };
    if (command === "resolve_file_path") return args.path;
    if (command === "load_file")
      return {
        columns: [{ name: args.path === "/work.md" ? "Work" : "Personal" }],
        tasks: [],
      };
    return undefined;
  });
});
afterEach(cleanup);

it("keeps an asynchronous edit bound to its original file when switching tabs", async () => {
  render(<App />);
  await screen.findByRole("tab", { name: /work.md/ });
  let finishSave: (() => void) | undefined;
  invoke.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finishSave = resolve;
      }),
  );
  fireEvent.click(screen.getByRole("button", { name: "+ Add column" }));
  await waitFor(() => expect(finishSave).toBeDefined());
  expect(invoke).toHaveBeenCalledWith(
    "save_current_board",
    expect.objectContaining({ path: "/work.md" }),
  );
  fireEvent.click(screen.getByRole("tab", { name: /personal.md/ }));
  expect(
    within(screen.getByRole("tabpanel")).getByRole("heading", {
      name: "personal.md",
    }),
  ).toBeTruthy();
  await act(async () => {
    finishSave?.();
  });
  expect(
    within(screen.getByRole("tabpanel")).queryByText("Column 2"),
  ).toBeNull();
  fireEvent.click(screen.getByRole("tab", { name: /work.md/ }));
  expect(
    within(screen.getByRole("tabpanel")).getByText("Column 2"),
  ).toBeTruthy();
  expect(
    invoke.mock.calls.filter(([command]) => command === "save_current_board"),
  ).toHaveLength(1);
});

it("supports keyboard tab selection and returning to welcome after closing all files", async () => {
  render(<App />);
  const work = await screen.findByRole("tab", { name: /work.md/ });
  fireEvent.keyDown(work, { key: "ArrowDown" });
  expect(
    screen
      .getByRole("tab", { name: /personal.md/ })
      .getAttribute("aria-selected"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Close personal.md" }));
  fireEvent.click(screen.getByRole("button", { name: "Close work.md" }));
  expect(
    await screen.findByText("Open a Markdown file to get started."),
  ).toBeTruthy();
});
