// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { forgetScrollPositions, useScrollPosition } from "./useScrollPosition";

afterEach(cleanup);

/** A scrollable div wired up with useScrollPosition for a given key. */
function ScrollBox({ scrollKey }: { scrollKey: string | null }) {
  const { ref, onScroll } = useScrollPosition(scrollKey);
  return (
    <div
      data-testid="box"
      ref={ref as React.Ref<HTMLDivElement>}
      onScroll={onScroll}
      style={{ overflow: "auto", height: "10px" }}
    >
      <div style={{ height: "1000px" }} />
    </div>
  );
}

/** Simulates switching tabs: swaps the key used by the same scroll box. */
function TabbedScrollBox({ initialKey }: { initialKey: string }) {
  const [key, setKey] = useState(initialKey);
  return (
    <div>
      <button type="button" onClick={() => setKey("tab-a")}>
        A
      </button>
      <button type="button" onClick={() => setKey("tab-b")}>
        B
      </button>
      <ScrollBox scrollKey={key} />
    </div>
  );
}

function setScroll(el: HTMLElement, top: number) {
  Object.defineProperty(el, "scrollTop", {
    configurable: true,
    value: top,
    writable: true,
  });
  el.dispatchEvent(new Event("scroll"));
}

describe("useScrollPosition", () => {
  it("restores the remembered scrollTop when the key changes on the same element", () => {
    const { getByTestId, getByText } = render(
      <TabbedScrollBox initialKey="tab-a" />,
    );
    const box = getByTestId("box");

    setScroll(box, 250);
    expect(box.scrollTop).toBe(250);

    // Switch to tab-b: a fresh tab has no remembered position yet.
    fireEvent.click(getByText("B"));
    expect(box.scrollTop).toBe(0);

    setScroll(box, 90);

    // Switch back to tab-a: its previous scroll position should be restored.
    fireEvent.click(getByText("A"));
    expect(box.scrollTop).toBe(250);

    // Switching back to tab-b restores what we set for it.
    fireEvent.click(getByText("B"));
    expect(box.scrollTop).toBe(90);
  });

  it("does not track scroll position when key is null", () => {
    const { getByTestId } = render(<ScrollBox scrollKey={null} />);
    const box = getByTestId("box");
    setScroll(box, 400);
    // No key means nothing is remembered; scrollTop stays whatever we set it to
    // but forgetting/restoring never kicks in (no throw, no-op).
    expect(box.scrollTop).toBe(400);
  });

  it("forgetScrollPositions removes remembered offsets for a key", () => {
    const { getByTestId, getByText } = render(
      <TabbedScrollBox initialKey="tab-a" />,
    );
    const box = getByTestId("box");
    setScroll(box, 300);

    forgetScrollPositions("tab-a");

    fireEvent.click(getByText("B"));
    fireEvent.click(getByText("A"));

    expect(box.scrollTop).toBe(0);
  });
});
