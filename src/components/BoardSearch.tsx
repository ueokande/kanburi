import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useComposing } from "../hooks/useComposing";
import { searchCompletion } from "../taskFilters";
import styles from "./BoardSearch.module.css";

export function BoardSearch({
  query,
  onChange,
  labels,
  matchCount,
  total,
  error,
}: {
  query: string;
  onChange: (query: string) => void;
  labels: string[];
  matchCount: number;
  total: number;
  error?: string;
}) {
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
  const selected = Math.min(highlight, options.length - 1);
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
    const suffix = query.slice(completion.end);
    const separator = option.continue || /^\s/.test(suffix) ? "" : " ";
    const text =
      query.slice(0, completion.start) + option.value + separator + suffix;
    const position =
      completion.start + option.value.length + (option.continue ? 0 : 1);
    pendingCaret.current = position;
    onChange(text);
    setCaret(position);
    setDismissed(false);
    setHighlight(0);
  }
  return (
    <div className={`${styles.wrap} ${open ? styles.expanded : ""}`}>
      {open && (
        <div className={styles.field}>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Search tasks"
            aria-autocomplete="list"
            aria-expanded={options.length > 0}
            aria-controls={options.length ? `${id}-options` : undefined}
            aria-activedescendant={
              options.length ? `${id}-option-${selected}` : undefined
            }
            placeholder="Search tasks"
            value={query}
            onFocus={(event) => {
              setFocused(true);
              refreshCompletion(event.currentTarget);
            }}
            onBlur={() => setFocused(false)}
            onCompositionStart={() => {
              composing.props.onCompositionStart();
              setIsComposing(true);
            }}
            onCompositionEnd={(event) => {
              composing.props.onCompositionEnd();
              setIsComposing(false);
              refreshCompletion(event.currentTarget);
              // WebViews can finalize the caret after compositionend.
              requestAnimationFrame(() => {
                if (inputRef.current) refreshCompletion(inputRef.current);
              });
            }}
            onChange={(event) => {
              onChange(event.target.value);
              setCaret(
                event.target.selectionStart ?? event.target.value.length,
              );
              setHighlight(0);
              setDismissed(false);
            }}
            onSelect={(event) => {
              const input = event.currentTarget;
              setCaret(input.selectionStart ?? query.length);
              if (input.selectionStart !== input.selectionEnd)
                setDismissed(true);
            }}
            onClick={() => setDismissed(false)}
            onKeyUp={(event) => {
              if (
                !composing.isComposing(event) &&
                (event.code === "Space" ||
                  event.key === " " ||
                  event.key === "　")
              ) {
                refreshCompletion(event.currentTarget);
              }
            }}
            onKeyDown={(event) => {
              if (composing.isComposing(event)) return;
              if (
                options.length &&
                (event.key === "ArrowDown" || event.key === "ArrowUp")
              ) {
                event.preventDefault();
                setHighlight(
                  (selected +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    options.length) %
                    options.length,
                );
              } else if (
                options.length &&
                (event.key === "Enter" || event.key === "Tab")
              ) {
                event.preventDefault();
                choose(selected);
              } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                if (options.length) setDismissed(true);
                else {
                  setOpen(false);
                  triggerRef.current?.focus();
                }
              }
            }}
          />
          {query && (
            <button
              type="button"
              className={styles.clear}
              aria-label="Clear search"
              onClick={() => {
                onChange("");
                setCaret(0);
                setDismissed(false);
                inputRef.current?.focus();
              }}
            >
              ×
            </button>
          )}
          {options.length > 0 && (
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
          <span
            role="status"
            aria-live="polite"
            className={error ? styles.error : styles.count}
          >
            {error ?? `${matchCount} of ${total} tasks`}
          </span>
        </div>
      )}
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${query.trim() ? styles.active : ""}`}
        aria-label={
          open ? "Hide search" : query.trim() ? "Search (active)" : "Search"
        }
        aria-expanded={open}
        onClick={() => setOpen(!open)}
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
        {query.trim() && <span className={styles.dot} />}
      </button>
    </div>
  );
}
