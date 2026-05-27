import { useEffect, useRef, useState } from "react";
import { useComposing } from "../hooks/useComposing";
import styles from "./AddTaskInput.module.css";

export interface AddTaskInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
}

export function AddTaskInput({ value, onChange, onAdd }: AddTaskInputProps) {
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useComposing();

  useEffect(() => {
    if (active) {
      inputRef.current?.focus();
    }
  }, [active]);

  function handleAdd() {
    onAdd();
    setActive(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !composing.isComposing(e)) handleAdd();
    if (e.key === "Escape" && !composing.isComposing(e)) {
      onChange("");
      setActive(false);
    }
  }

  function handleBlur() {
    onChange("");
    setActive(false);
  }

  if (!active) {
    return (
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setActive(true)}
      >
        + Add task
      </button>
    );
  }

  return (
    <div className={styles.addTask}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...composing.props}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Task title… #Label @date"
      />
      {/* preventDefault on mousedown keeps focus on input so onClick still fires */}
      <button
        type="button"
        className={styles.addBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleAdd}
      >
        Add
      </button>
    </div>
  );
}
