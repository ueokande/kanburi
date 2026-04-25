import styles from "./DatePicker.module.css";

interface Props {
  date: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function DatePicker({ date, onChange }: Props) {
  return (
    <label className={styles.label}>
      Due date
      <input
        className={styles.input}
        type="date"
        value={date ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </label>
  );
}
