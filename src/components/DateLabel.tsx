import { formatDueDate, isOverdue } from "../utils";
import styles from "./DateLabel.module.css";

interface Props {
  date?: string;
}

export function DateLabel({ date }: Props) {
  if (!date) return null;
  return (
    <span
      className={`${styles.badge} ${isOverdue(date) ? styles.overdue : ""}`}
    >
      {formatDueDate(date)}
    </span>
  );
}
