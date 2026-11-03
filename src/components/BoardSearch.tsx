import type {
  ChangeEvent,
  CompositionEvent,
  KeyboardEvent,
  SyntheticEvent,
} from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useComposing } from "../hooks/useComposing";
import { applySearchCompletion, searchCompletion } from "../taskFilters";
import styles from "./BoardSearch.module.css";

interface BoardSearchProps {
  query: string;
  onChange: (query: string) => void;
  labels: string[];
  invalid?: boolean;
}

export function BoardSearch({
  query,
  onChange,
  labels,
  invalid,
}: BoardSearchProps) {
  const [open, setOpen] = useState(false);
  const [caret, setCaret] = useState(query.length);
  const [highlight, setHighlight] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const composing = useComposing();
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const pendingCaret = useRef<number | null>(null);
  useLayoutEffect(() => {
    const position = pendingCaret.current;
    if (position === null) return;
    pendingCaret.current = null;
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(position, position);
    setCaret(position);
  });
  const completion =
    !dismissed && focused && !isComposing
      ? searchCompletion(query, caret, labels)
      : null;
  const options = completion?.options ?? [];
  const hasOptions = options.length > 0;
  const hasQuery = query.trim().length > 0;
  const selected = hasOptions ? Math.min(highlight, options.length - 1) : 0;
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (options.length)
      document
        .getElementById(`${id}-option-${selected}`)
        ?.scrollIntoView?.({ block: "nearest" });
  }, [id, selected, options.length]);
  function refreshCompletion(input: HTMLInputElement) {
    setCaret(input.selectionStart ?? input.value.length);
    setHighlight(0);
    setDismissed(input.selectionStart !== input.selectionEnd);
  }
  function choose(index: number) {
    const option = options[index];
    if (!completion || !option) return;
    const applied = applySearchCompletion(query, completion, option);
    pendingCaret.current = applied.caret;
    onChange(applied.query);
    setCaret(applied.caret);
    setDismissed(false);
    setHighlight(0);
  }
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
    setCaret(event.target.selectionStart ?? event.target.value.length);
    setHighlight(0);
    setDismissed(false);
  }
  function handleSelect(event: SyntheticEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    setCaret(input.selectionStart ?? query.length);
    if (input.selectionStart !== input.selectionEnd) setDismissed(true);
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
      setHighlight((selected + direction + options.length) % options.length);
      return;
    }
    if (hasOptions && (event.key === "Enter" || event.key === "Tab")) {
      event.preventDefault();
      choose(selected);
      return;
    }
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    if (hasOptions) {
      setDismissed(true);
    } else if (!hasQuery) {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }
  function clearSearch() {
    onChange("");
    setCaret(0);
    setDismissed(false);
    inputRef.current?.focus();
  }
  return (
    <div className={`${styles.wrap} ${open ? styles.expanded : ""}`}>
      {open && (
        <div className={styles.field}>
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            // React 18 does not yet type this standard HTML attribute.
            {...{ writingsuggestions: "false" }}
            role="combobox"
            aria-label="Search tasks"
            aria-invalid={invalid || undefined}
            aria-autocomplete="list"
            aria-expanded={hasOptions}
            aria-controls={hasOptions ? `${id}-options` : undefined}
            aria-activedescendant={
              hasOptions ? `${id}-option-${selected}` : undefined
            }
            placeholder="Search tasks"
            value={query}
            onFocus={(event) => {
              setFocused(true);
              refreshCompletion(event.currentTarget);
            }}
            onBlur={() => {
              setFocused(false);
              if (!query.trim()) setOpen(false);
            }}
            onCompositionStart={() => {
              composing.props.onCompositionStart();
              setIsComposing(true);
            }}
            onCompositionEnd={handleCompositionEnd}
            onChange={handleChange}
            onSelect={handleSelect}
            onClick={() => setDismissed(false)}
            onKeyUp={handleKeyUp}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              type="button"
              className={styles.clear}
              aria-label="Clear search"
              onClick={clearSearch}
            >
              ×
            </button>
          )}
          {hasOptions && (
            <div className={styles.suggestions}>
              <div className={styles.group}>{completion?.kind}</div>
              <div
                id={`${id}-options`}
                role="listbox"
                aria-label="Search suggestions"
              >
                {options.map((option, index) => (
                  <button
                    key={option.value}
                    id={`${id}-option-${index}`}
                    type="button"
                    role="option"
                    aria-selected={index === selected}
                    tabIndex={-1}
                    className={index === selected ? styles.selected : ""}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setHighlight(index)}
                    onClick={() => choose(index)}
                  >
                    <span>{option.value}</span>
                    <small>
                      {option.label !== option.value ? option.label : "Label"}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${hasQuery ? styles.active : ""}`}
        aria-label={
          open ? "Hide search" : hasQuery ? "Search (active)" : "Search"
        }
        aria-expanded={open}
        onClick={() => setOpen((expanded) => !expanded)}
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        {hasQuery && <span className={styles.dot} />}
      </button>
    </div>
  );
}
