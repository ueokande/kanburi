import type {
  ChangeEvent,
  CompositionEvent,
  FocusEvent,
  KeyboardEvent,
  SyntheticEvent,
} from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { applySearchCompletion, searchCompletion } from "../taskFilters";
import { useComposing } from "./useComposing";

interface UseBoardSearchOptions {
  query: string;
  onChange: (query: string) => void;
  labels: string[];
}

export function useBoardSearch({
  query,
  onChange,
  labels,
}: UseBoardSearchOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [caret, setCaret] = useState(query.length);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const composing = useComposing();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const id = useId();

  const completion =
    !suggestionsDismissed && isFocused && !isComposing
      ? searchCompletion(query, caret, labels)
      : null;
  const options = completion?.options ?? [];
  const hasOptions = options.length > 0;
  const hasQuery = query.trim().length > 0;
  const selectedIndex = hasOptions
    ? Math.min(highlightedIndex, options.length - 1)
    : 0;
  const optionsId = `${id}-options`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const activeOptionId = optionId(selectedIndex);

  useLayoutEffect(() => {
    const position = pendingCaret.current;
    if (position === null) return;
    pendingCaret.current = null;
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(position, position);
    setCaret(position);
  });

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (hasOptions)
      document
        .getElementById(activeOptionId)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [activeOptionId, hasOptions]);

  function refreshCompletion(input: HTMLInputElement) {
    setCaret(input.selectionStart ?? input.value.length);
    setHighlightedIndex(0);
    setSuggestionsDismissed(input.selectionStart !== input.selectionEnd);
  }

  function selectOption(index: number) {
    const option = options[index];
    if (!completion || !option) return;
    const applied = applySearchCompletion(query, completion, option);
    pendingCaret.current = applied.caret;
    onChange(applied.query);
    setCaret(applied.caret);
    setSuggestionsDismissed(false);
    setHighlightedIndex(0);
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    setIsFocused(true);
    refreshCompletion(event.currentTarget);
  }

  function handleBlur() {
    setIsFocused(false);
    if (!hasQuery) setIsOpen(false);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
    setCaret(event.target.selectionStart ?? event.target.value.length);
    setHighlightedIndex(0);
    setSuggestionsDismissed(false);
  }

  function handleSelect(event: SyntheticEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    setCaret(input.selectionStart ?? query.length);
    if (input.selectionStart !== input.selectionEnd)
      setSuggestionsDismissed(true);
  }

  function handleCompositionStart() {
    composing.props.onCompositionStart();
    setIsComposing(true);
  }

  function handleCompositionEnd(event: CompositionEvent<HTMLInputElement>) {
    composing.props.onCompositionEnd();
    setIsComposing(false);
    refreshCompletion(event.currentTarget);
    // WebViews can finalize the caret after compositionend.
    requestAnimationFrame(() => {
      if (inputRef.current) refreshCompletion(inputRef.current);
    });
  }

  function handleKeyUp(event: KeyboardEvent<HTMLInputElement>) {
    if (
      !composing.isComposing(event) &&
      (event.code === "Space" || event.key === " " || event.key === "　")
    ) {
      refreshCompletion(event.currentTarget);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (composing.isComposing(event)) return;
    if (hasOptions && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setHighlightedIndex(
        (selectedIndex + direction + options.length) % options.length,
      );
      return;
    }
    if (hasOptions && (event.key === "Enter" || event.key === "Tab")) {
      event.preventDefault();
      selectOption(selectedIndex);
      return;
    }
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    if (hasOptions) {
      setSuggestionsDismissed(true);
    } else if (!hasQuery) {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  }

  function clear() {
    onChange("");
    setCaret(0);
    setSuggestionsDismissed(false);
    inputRef.current?.focus();
  }

  return {
    activeOptionId,
    clear,
    completion,
    hasOptions,
    hasQuery,
    highlightOption: setHighlightedIndex,
    inputRef,
    inputHandlers: {
      onBlur: handleBlur,
      onChange: handleChange,
      onClick: () => setSuggestionsDismissed(false),
      onCompositionEnd: handleCompositionEnd,
      onCompositionStart: handleCompositionStart,
      onFocus: handleFocus,
      onKeyDown: handleKeyDown,
      onKeyUp: handleKeyUp,
      onSelect: handleSelect,
    },
    isOpen,
    options,
    optionsId,
    optionId,
    selectedIndex,
    selectOption,
    toggle: () => setIsOpen((open) => !open),
    triggerRef,
  };
}
