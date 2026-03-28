import styles from "./AddTaskInput.module.css";

export interface AddTaskInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
}

export function AddTaskInput({ value, onChange, onAdd }: AddTaskInputProps) {
  return (
    <div className={styles.addTask}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
        placeholder="Add task… #Label @date"
      />
      <button type="button" onClick={onAdd}>
        Add
      </button>
    </div>
  );
}
