import styles from "./DescriptionInput.module.css";

interface Props {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function DescriptionInput({ value, onChange }: Props) {
  return (
    <label className={styles.label}>
      Description
      <textarea
        className={styles.textarea}
        rows={4}
        value={value ?? ""}
        placeholder="Add a description…"
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </label>
  );
}
