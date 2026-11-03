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

it("uses the Markdown H1 in the sidebar and board header, and preserves it on save", async () => {
  const original = invoke.getMockImplementation();
  invoke.mockImplementation(async (command, args) => {
    if (command === "load_file")
      return {
        title: args.path === "/work.md" ? "Project roadmap" : null,
        columns: [{ name: "To Do" }],
        tasks: [],
      };
    return original?.(command, args);
  });
  render(<App />);
  const tab = await screen.findByRole("tab", { name: /Project roadmap/ });
  expect(tab.textContent).toContain("/work.md");
  expect(
    within(screen.getByRole("tabpanel")).getByRole("heading", {
      name: "Project roadmap",
    }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "+ Add column" }));
  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith(
      "save_current_board",
      expect.objectContaining({
        path: "/work.md",
        board: expect.objectContaining({ title: "Project roadmap" }),
      }),
    ),
  );
  fireEvent.click(screen.getByRole("tab", { name: /personal.md/ }));
  expect(
    within(screen.getByRole("tabpanel")).getByRole("heading", {
      name: "personal.md",
    }),
  ).toBeTruthy();
});

it("has one sidebar open action and no extra action above a collapsed board", async () => {
  render(<App />);
  await screen.findByRole("tab", { name: /work.md/ });
  expect(screen.queryByText("OPEN FILES")).toBeNull();
  expect(screen.getAllByRole("button", { name: /Open file/ })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(screen.queryByRole("button", { name: "Show open files" })).toBeNull();
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeTruthy();
  expect(screen.getByRole("tabpanel").getAttribute("aria-label")).toBe(
    "work.md",
  );
  fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
  expect(screen.getByRole("tab", { name: /work.md/ })).toBeTruthy();
});

it("resizes the sidebar with the keyboard and remembers its width across collapse", async () => {
  render(<App />);
  await screen.findByRole("tab", { name: /work.md/ });
  const separator = screen.getByRole("separator", { name: "Resize sidebar" });
  expect(separator.getAttribute("aria-valuenow")).toBe("250");
  fireEvent.keyDown(separator, { key: "ArrowRight" });
  expect(separator.getAttribute("aria-valuenow")).toBe("266");
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(screen.getByRole("separator").getAttribute("aria-valuenow")).toBe(
    "64",
  );
  fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
  const expanded = screen.getByRole("separator", { name: "Resize sidebar" });
  expect(expanded.getAttribute("aria-valuenow")).toBe("266");
  fireEvent.keyDown(expanded, { key: "Home" });
  expect(expanded.getAttribute("aria-valuenow")).toBe("64");
  fireEvent.keyDown(expanded, { key: "ArrowLeft" });
  expect(expanded.getAttribute("aria-valuenow")).toBe("64");
  fireEvent.doubleClick(expanded);
  expect(expanded.getAttribute("aria-valuenow")).toBe("250");
});

it("drags the sidebar border with pointer capture and stops on pointer cancellation", async () => {
  render(<App />);
  await screen.findByRole("tab", { name: /work.md/ });
  const separator = screen.getByRole("separator", { name: "Resize sidebar" });
  const capture = vi.fn();
  const release = vi.fn();
  Object.assign(separator, {
    setPointerCapture: capture,
    hasPointerCapture: () => true,
    releasePointerCapture: release,
  });
  fireEvent.pointerDown(separator, { pointerId: 7, button: 0, clientX: 250 });
  expect(capture).toHaveBeenCalledWith(7);
  fireEvent.pointerMove(separator, { pointerId: 8, clientX: 450 });
  expect(separator.getAttribute("aria-valuenow")).toBe("250");
  fireEvent.pointerMove(separator, { pointerId: 7, clientX: 340 });
  expect(separator.getAttribute("aria-valuenow")).toBe("340");
  fireEvent.pointerUp(separator, { pointerId: 7 });
  expect(release).toHaveBeenCalledWith(7);
  fireEvent.pointerMove(separator, { pointerId: 7, clientX: 400 });
  expect(separator.getAttribute("aria-valuenow")).toBe("340");
  fireEvent.pointerDown(separator, { pointerId: 9, button: 0, clientX: 340 });
  fireEvent.pointerCancel(separator, { pointerId: 9 });
  fireEvent.pointerMove(separator, { pointerId: 9, clientX: 400 });
  expect(separator.getAttribute("aria-valuenow")).toBe("340");
});

it("opens workspace settings from the sidebar and restores focus after closing", async () => {
  render(<App />);
  await screen.findByRole("tab", { name: /work.md/ });
  const settings = screen.getByRole("button", { name: "Settings" });
  fireEvent.click(settings);
  const dialog = screen.getByRole("dialog", { name: "Settings" });
  fireEvent.click(
    within(dialog).getByRole("checkbox", {
      name: "Restore open files on startup",
    }),
  );
  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith("save_settings", {
      settings: expect.objectContaining({ restoreOnStartup: false }),
    }),
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(settings);
});

it("snaps to the minimum or closed width and can reopen within the same drag", async () => {
  render(<App />);
  await screen.findByRole("tab", { name: /work.md/ });
  const separator = screen.getByRole("separator", { name: "Resize sidebar" });
  const capture = vi.fn();
  const release = vi.fn();
  Object.assign(separator, {
    setPointerCapture: capture,
    hasPointerCapture: () => true,
    releasePointerCapture: release,
  });
  fireEvent.pointerDown(separator, { pointerId: 12, button: 0, clientX: 250 });
  fireEvent.pointerMove(separator, { pointerId: 12, clientX: 160 });
  expect(separator.getAttribute("aria-valuenow")).toBe("180");
  expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeTruthy();
  fireEvent.pointerMove(separator, { pointerId: 12, clientX: 100 });
  expect(separator.getAttribute("aria-valuenow")).toBe("64");
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeTruthy();
  expect(screen.getByRole("separator")).toBe(separator);
  expect(release).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(invoke).toHaveBeenCalledWith("save_settings", {
      settings: expect.objectContaining({ sidebarCollapsed: true }),
    }),
  );
  fireEvent.pointerMove(separator, { pointerId: 12, clientX: 160 });
  expect(separator.getAttribute("aria-valuenow")).toBe("180");
  expect(screen.getByRole("tab", { name: /work.md/ })).toBeTruthy();
  fireEvent.pointerMove(separator, { pointerId: 12, clientX: 290 });
  expect(separator.getAttribute("aria-valuenow")).toBe("290");
  fireEvent.pointerUp(separator, { pointerId: 12 });
  expect(release).toHaveBeenCalledWith(12);
});

it("can resize open from a button-collapsed sidebar and expand on double-click", async () => {
  render(<App />);
  await screen.findByRole("tab", { name: /work.md/ });
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  const separator = screen.getByRole("separator", { name: "Resize sidebar" });
  Object.assign(separator, {
    setPointerCapture: vi.fn(),
    hasPointerCapture: () => true,
    releasePointerCapture: vi.fn(),
  });
  fireEvent.pointerDown(separator, { pointerId: 13, button: 0, clientX: 64 });
  fireEvent.pointerMove(separator, { pointerId: 13, clientX: 100 });
  expect(separator.getAttribute("aria-valuenow")).toBe("64");
  fireEvent.pointerMove(separator, { pointerId: 13, clientX: 200 });
  expect(separator.getAttribute("aria-valuenow")).toBe("200");
  expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeTruthy();
  fireEvent.pointerUp(separator, { pointerId: 13 });
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  fireEvent.doubleClick(separator);
  expect(separator.getAttribute("aria-valuenow")).toBe("250");
  expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeTruthy();
});
