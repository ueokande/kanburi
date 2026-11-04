import { useBoardSearch } from "../hooks/useBoardSearch";
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
  const search = useBoardSearch({ query, onChange, labels });
  return (
    <div className={`${styles.wrap} ${search.isOpen ? styles.expanded : ""}`}>
      {search.isOpen && (
        <div className={styles.field}>
          <input
            ref={search.inputRef}
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
            aria-expanded={search.hasOptions}
            aria-controls={search.hasOptions ? search.optionsId : undefined}
            aria-activedescendant={
              search.hasOptions ? search.activeOptionId : undefined
            }
            placeholder="Search tasks"
            value={query}
            {...search.inputHandlers}
          />
          {query && (
            <button
              type="button"
              className={styles.clear}
              aria-label="Clear search"
              onClick={search.clear}
            >
              ×
            </button>
          )}
          {search.hasOptions && (
            <div className={styles.suggestions}>
              <div className={styles.group}>{search.completion?.kind}</div>
              <div
                id={search.optionsId}
                role="listbox"
                aria-label="Search suggestions"
              >
                {search.options.map((option, index) => (
                  <button
                    key={option.value}
                    id={search.optionId(index)}
                    type="button"
                    role="option"
                    aria-selected={index === search.selectedIndex}
                    tabIndex={-1}
                    className={
                      index === search.selectedIndex ? styles.selected : ""
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => search.highlightOption(index)}
                    onClick={() => search.selectOption(index)}
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
        ref={search.triggerRef}
        type="button"
        className={`${styles.trigger} ${search.hasQuery ? styles.active : ""}`}
        aria-label={
          search.isOpen
            ? "Hide search"
            : search.hasQuery
              ? "Search (active)"
              : "Search"
        }
        aria-expanded={search.isOpen}
        onClick={search.toggle}
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
        {search.hasQuery && <span className={styles.dot} />}
      </button>
    </div>
  );
}
