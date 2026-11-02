// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeSeedBoard, makeWrapper } from "../hooks/testUtils";
import { LabelEditor } from "./LabelEditor";

function setup(labels: string[] = ["Bug"]) {
  const board = makeSeedBoard();
  board.tasks[0].labels = ["Backend", "Frontend", "Feature", "Bug"];
  const onAdd = vi.fn().mockResolvedValue(undefined);
  const onRename = vi.fn().mockResolvedValue(undefined);
  const onRemove = vi.fn();
  render(
    <LabelEditor
      labels={labels}
      onAdd={onAdd}
      onRename={onRename}
      onRemove={onRemove}
    />,
    { wrapper: makeWrapper(board) },
  );
  return { onAdd, onRename, onRemove };
}
function addInput() {
  fireEvent.click(screen.getByRole("button", { name: "Add label" }));
  return screen.getByRole("combobox") as HTMLInputElement;
}
function type(input: HTMLInputElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

afterEach(cleanup);

describe("label autocomplete", () => {
  it("focuses the input and shows unique board labels excluding existing labels", () => {
    setup();
    const input = addInput();
    expect(document.activeElement).toBe(input);
    expect(
      screen.getAllByRole("option").map((node) => node.textContent),
    ).toEqual(["#Backend", "#Feature", "#Frontend"]);
    expect(input.getAttribute("aria-controls")).toBe(
      screen.getByRole("listbox").id,
    );
  });

  it("filters prefixes ignoring case and adds a clicked suggestion", async () => {
    const { onAdd } = setup();
    const input = addInput();
    type(input, "#fr");
    expect(screen.getByRole("option", { name: "#Frontend" })).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole("option", { name: "#Frontend" }));
    fireEvent.click(screen.getByRole("option", { name: "#Frontend" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith("Frontend"));
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Add label" }),
    );
  });

  it("supports arrows and announces the highlighted option before Enter", async () => {
    const { onAdd } = setup();
    const input = addInput();
    fireEvent.keyDown(input, { key: "ArrowUp" });
    const selectedId = input.getAttribute("aria-activedescendant");
    expect(document.getElementById(selectedId ?? "")?.textContent).toBe(
      "#Frontend",
    );
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith("Backend"));
  });

  it("clears highlight after typing and lets Enter create the typed label", async () => {
    const { onAdd } = setup();
    const input = addInput();
    fireEvent.keyDown(input, { key: "ArrowDown" });
    type(input, "NewLabel");
    expect(input.getAttribute("aria-activedescendant")).toBeNull();
    expect(screen.getByRole("option", { name: "Add #NewLabel" })).toBeTruthy();
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith("NewLabel"));
  });

  it("creates a new label via the explicit add option", async () => {
    const { onAdd } = setup();
    type(addInput(), "Release");
    fireEvent.click(screen.getByRole("option", { name: "Add #Release" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith("Release"));
  });

  it.each([
    "Bug",
    "two words",
    "two\u3000words",
  ])("shows validation and prevents invalid add: %s", async (value) => {
    const { onAdd } = setup();
    const input = addInput();
    type(input, value);
    expect(screen.getByRole("status").textContent).toMatch(
      value === "Bug" ? /Already added/ : /cannot contain spaces/,
    );
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toBe(input);
  });

  it.each([
    "escape",
    "blur",
    "outside",
    "tab",
  ])("cancels without saving on %s", (mode) => {
    const { onAdd } = setup();
    const input = addInput();
    type(input, "Unfinished");
    if (mode === "escape") fireEvent.keyDown(input, { key: "Escape" });
    if (mode === "blur") fireEvent.blur(input);
    if (mode === "outside") fireEvent.pointerDown(document.body);
    if (mode === "tab") {
      fireEvent.keyDown(input, { key: "Tab" });
      fireEvent.blur(input);
    }
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.queryByRole("combobox")).toBeNull();
    if (mode === "escape")
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Add label" }),
      );
  });

  it("does not confirm with Enter during IME composition, including keyCode 229", async () => {
    const { onAdd } = setup();
    const input = addInput();
    type(input, "日本語");
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: "Enter", keyCode: 229 });
    expect(onAdd).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith("日本語"));
  });

  it("edits only this card's label and shows that scope", async () => {
    const { onRename, onAdd } = setup();
    fireEvent.click(
      screen.getByRole("button", { name: "Change label Bug on this card" }),
    );
    expect(screen.getByText(/Changes apply to this card only/)).toBeTruthy();
    const input = screen.getByRole("combobox") as HTMLInputElement;
    expect(input.value).toBe("Bug");
    type(input, "Feature");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(onRename).toHaveBeenCalledWith("Bug", "Feature"),
    );
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("Escape restores the existing label and keyboard focus", () => {
    const { onRename } = setup();
    fireEvent.click(
      screen.getByRole("button", { name: "Change label Bug on this card" }),
    );
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(onRename).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Change label Bug on this card" }),
    );
  });

  it("preserves input on save failure and supports retry", async () => {
    const { onAdd } = setup();
    onAdd.mockRejectedValueOnce(new Error("Write failed"));
    const input = addInput();
    type(input, "Release");
    fireEvent.keyDown(input, { key: "Enter" });
    await screen.findByText(/Could not save/);
    expect(input.value).toBe("Release");
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
    expect(onAdd).toHaveBeenCalledTimes(2);
  });

  it("prevents duplicate saves while one is pending", async () => {
    const { onAdd } = setup();
    let finish: (() => void) | undefined;
    onAdd.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const input = addInput();
    type(input, "Release");
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAdd).toHaveBeenCalledOnce();
    await act(async () => {
      finish?.();
    });
    expect(screen.queryByRole("combobox")).toBeNull();
  });
});
