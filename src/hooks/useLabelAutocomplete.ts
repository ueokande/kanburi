import type { KeyboardEvent } from "react";
import { useId, useLayoutEffect, useState } from "react";
import { useKanbanState } from "../context/BoardContext";
import { getAllLabels } from "../utils";
import { useComposing } from "./useComposing";
import type { LabelField } from "./useLabelDraft";

interface Options {
  labels: string[];
  label: string;
  field: LabelField | null;
  onCommit: (label: string) => Promise<void>;
  onCancel: () => void;
}

/** Board-scoped suggestions and keyboard selection, independent of persistence. */
export function useLabelAutocomplete({
  labels,
  label,
  field,
  onCommit,
  onCancel,
}: Options) {
  const { board } = useKanbanState();
  const [highlight, setHighlight] = useState(-1);
  const composing = useComposing();
  const id = useId();
  const listId = `${id}-options`;
  const original = field?.kind === "edit" ? field.original : undefined;
  const otherLabels = labels.filter((value) => value !== original);
  const allLabels = getAllLabels(board.tasks);
  const valid = !/\s/u.test(label);
  const suggestions =
    field && valid
      ? allLabels
          .filter(
            (value) =>
              !otherLabels.includes(value) &&
              value.toLocaleLowerCase().startsWith(label.toLocaleLowerCase()),
          )
          .slice(0, 5)
      : [];
  const canCreate =
    !!label &&
    valid &&
    !otherLabels.includes(label) &&
    !allLabels.includes(label);
  const options = [
    ...suggestions.map((text) => ({ text, create: false })),
    ...(canCreate ? [{ text: label, create: true }] : []),
  ];
  const activeIndex = highlight < options.length ? highlight : -1;
  const activeOptionId =
    activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined;

  useLayoutEffect(() => {
    if (activeOptionId)
      document
        .getElementById(activeOptionId)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [activeOptionId]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (composing.isComposing(event)) return;
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        onCancel();
        break;
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (options.length)
          setHighlight((index) =>
            event.key === "ArrowDown"
              ? (index + 1) % options.length
              : index <= 0
                ? options.length - 1
                : index - 1,
          );
        break;
      case "Enter":
        event.preventDefault();
        void onCommit(activeIndex >= 0 ? options[activeIndex].text : label);
        break;
    }
  }

  return {
    options,
    activeIndex,
    activeOptionId,
    listId,
    getOptionId: (index: number) => `${id}-option-${index}`,
    highlight: setHighlight,
    reset: () => setHighlight(-1),
    inputHandlers: { ...composing.props, onKeyDown: handleKeyDown },
  };
}
