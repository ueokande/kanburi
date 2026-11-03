import { useEffect, useId, useRef, useState } from "react";
import type { DueFilter, TaskFilters } from "../taskFilters";
import { activeFilterCount, emptyTaskFilters } from "../taskFilters";
import styles from "./BoardFilter.module.css";

export function BoardFilter({
  filters,
  onChange,
  labels,
  matchCount,
  total,
}: {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  labels: string[];
  matchCount: number;
  total: number;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const count = activeFilterCount(filters);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    function outside(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !wrapRef.current?.contains(event.target)
      )
        setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);
  return (
    <div
      ref={wrapRef}
      className={styles.wrap}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node &&
          !event.currentTarget.contains(event.relatedTarget)
        )
          setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${count ? styles.active : ""}`}
        aria-label={count ? `Filter (${count} active filters)` : "Filter"}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        <svg
          viewBox="0 0 24 24"
          width="17"
          height="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M7 12h10M10 17h4" />
        </svg>
        Filter{" "}
        {count > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {count}
          </span>
        )}
      </button>
      {open && (
        <div
          id={id}
          role="dialog"
          aria-label="Filter tasks"
          className={styles.panel}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              triggerRef.current?.focus();
            }
          }}
        >
          <div className={styles.heading}>
            <strong>Filter tasks</strong>
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              ×
            </button>
          </div>
          <label htmlFor={`${id}-search`}>Search</label>
          <input
            ref={inputRef}
            id={`${id}-search`}
            type="search"
            placeholder="Titles, descriptions, labels…"
            aria-label="Search tasks"
            value={filters.query}
            onChange={(event) =>
              onChange({ ...filters, query: event.target.value })
            }
          />
          <label htmlFor={`${id}-label`}>Label</label>
          <select
            id={`${id}-label`}
            value={filters.label}
            onChange={(event) =>
              onChange({ ...filters, label: event.target.value })
            }
          >
            <option value="">All labels</option>
            {[
              ...new Set([
                ...labels,
                ...(filters.label ? [filters.label] : []),
              ]),
            ].map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <label htmlFor={`${id}-due`}>Due date</label>
          <select
            id={`${id}-due`}
            value={filters.due}
            onChange={(event) =>
              onChange({ ...filters, due: event.target.value as DueFilter })
            }
          >
            <option value="any">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Today</option>
            <option value="week">Next 7 days</option>
            <option value="none">No due date</option>
          </select>
          <footer className={styles.footer}>
            <span role="status" aria-live="polite">
              {count ? `${matchCount} of ${total} tasks` : `${total} tasks`}
            </span>
            <button
              type="button"
              disabled={!count && !filters.query}
              onClick={() => {
                onChange(emptyTaskFilters);
                inputRef.current?.focus();
              }}
            >
              Clear filters
            </button>
          </footer>
        </div>
      )}
    </div>
  );
}
