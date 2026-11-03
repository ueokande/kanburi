// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspace, type WorkspaceSettings } from "./useWorkspace";

const { invoke, open } = vi.hoisted(() => ({ invoke: vi.fn(), open: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open }));
const board = { columns: [{ name: "To Do" }], tasks: [] };
const defaults: WorkspaceSettings = {
  restoreOnStartup: true,
  openFiles: [],
  activeFile: null,
  sidebarCollapsed: false,
};
let settings: WorkspaceSettings;
let missing: string[];
let failSettings: boolean;

beforeEach(() => {
  vi.clearAllMocks();
  settings = { ...defaults };
  missing = [];
  failSettings = false;
  invoke.mockImplementation(
    async (command: string, args?: { path?: string }) => {
      if (command === "load_settings") {
        if (failSettings) throw new Error("Invalid JSON");
        return settings;
      }
      if (command === "resolve_file_path") {
        if (missing.includes(args?.path ?? ""))
          throw new Error("File not found");
        return args?.path === "/alias.md" ? "/work.md" : args?.path;
      }
      if (command === "load_file") return board;
      return undefined;
    },
  );
});
afterEach(cleanup);

async function mountWorkspace() {
  const hook = renderHook(() => useWorkspace());
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

describe("workspace", () => {
  it("restores file order and active tab and skips unavailable files", async () => {
    settings = {
      ...defaults,
      openFiles: ["/work.md", "/missing.md", "/personal.md", "/work.md"],
      activeFile: "/personal.md",
    };
    missing = ["/missing.md"];
    const { result } = await mountWorkspace();
    expect(result.current.tabs.map((tab) => tab.path)).toEqual([
      "/work.md",
      "/personal.md",
    ]);
    expect(result.current.activeFile).toBe("/personal.md");
    expect(result.current.error).toContain("/missing.md");
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("save_settings", {
        settings: {
          ...defaults,
          openFiles: ["/work.md", "/personal.md"],
          activeFile: "/personal.md",
        },
      }),
    );
  });

  it("falls back to a surviving tab when the active file is missing", async () => {
    settings = {
      ...defaults,
      openFiles: ["/missing.md", "/work.md"],
      activeFile: "/missing.md",
    };
    missing = ["/missing.md"];
    const { result } = await mountWorkspace();
    expect(result.current.activeFile).toBe("/work.md");
  });

  it("does not load files when restoration is disabled", async () => {
    settings = {
      ...defaults,
      restoreOnStartup: false,
      openFiles: ["/work.md"],
    };
    const { result } = await mountWorkspace();
    expect(result.current.tabs).toEqual([]);
    expect(invoke).not.toHaveBeenCalledWith("load_file", expect.anything());
  });

  it("opens multiple files and reselects duplicate paths without reloading them", async () => {
    const { result } = await mountWorkspace();
    open.mockResolvedValue(["/work.md", "/alias.md", "/personal.md"]);
    await act(async () => {
      await result.current.openFiles();
    });
    await act(async () => {
      await result.current.loadPaths(["/alias.md"]);
    });
    expect(result.current.tabs.map((tab) => tab.path)).toEqual([
      "/work.md",
      "/personal.md",
    ]);
    expect(result.current.activeFile).toBe("/work.md");
    expect(
      invoke.mock.calls.filter(([command]) => command === "load_file"),
    ).toHaveLength(2);
    expect(open).toHaveBeenCalledWith(
      expect.objectContaining({ multiple: true }),
    );
  });

  it("closing tabs selects a neighbour, preserves an inactive selection, and saves an empty session", async () => {
    const { result } = await mountWorkspace();
    await act(async () => {
      await result.current.loadPaths(["/a.md", "/b.md", "/c.md"]);
    });
    act(() => result.current.closeFile("/a.md"));
    expect(result.current.activeFile).toBe("/c.md");
    act(() => result.current.closeFile("/c.md"));
    expect(result.current.activeFile).toBe("/b.md");
    act(() => result.current.closeFile("/b.md"));
    expect(result.current.activeFile).toBeNull();
    await waitFor(() =>
      expect(invoke).toHaveBeenLastCalledWith("save_settings", {
        settings: defaults,
      }),
    );
  });

  it("does not erase unreadable settings until the user explicitly resets them", async () => {
    failSettings = true;
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.ready).toBe(false);
    expect(invoke).not.toHaveBeenCalledWith("save_settings", expect.anything());
    act(() => result.current.resetSettings());
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("save_settings", {
        settings: defaults,
      }),
    );
  });

  it("keeps settings writes ordered while selections change", async () => {
    const { result } = await mountWorkspace();
    await act(async () => {
      await result.current.loadPaths(["/a.md", "/b.md"]);
    });
    let release: (() => void) | undefined;
    invoke.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    act(() => result.current.selectFile("/a.md"));
    await waitFor(() => expect(release).toBeDefined());
    act(() => result.current.selectFile("/b.md"));
    const count = invoke.mock.calls.length;
    await act(async () => {
      release?.();
    });
    await waitFor(() =>
      expect(invoke.mock.calls.length).toBeGreaterThan(count),
    );
    expect(invoke).toHaveBeenLastCalledWith("save_settings", {
      settings: {
        ...defaults,
        openFiles: ["/a.md", "/b.md"],
        activeFile: "/b.md",
      },
    });
  });

  it("handles StrictMode startup without duplicating tabs", async () => {
    settings = { ...defaults, openFiles: ["/work.md"], activeFile: "/work.md" };
    const { result } = renderHook(() => useWorkspace(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <StrictMode>{children}</StrictMode>
      ),
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.tabs).toHaveLength(1);
  });

  it("reports failed settings saves and allows retry", async () => {
    const { result } = await mountWorkspace();
    invoke.mockRejectedValueOnce("Disk full");
    act(() => result.current.setRestoreOnStartup(false));
    await waitFor(() =>
      expect(result.current.settingsError).toContain("Disk full"),
    );
    act(() => result.current.retrySettings());
    await waitFor(() => expect(result.current.settingsError).toBeUndefined());
    expect(invoke).toHaveBeenLastCalledWith("save_settings", {
      settings: { ...defaults, restoreOnStartup: false },
    });
  });
});
