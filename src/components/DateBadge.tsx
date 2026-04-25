import { isOverdue } from "../utils";
import styles from "./DateBadge.module.css";

interface Props {
  date?: string;
}

export function DateBadge({ date }: Props) {
  if (!date) return null;
  return (
    <span className={`${styles.badge} ${isOverdue(date) ? styles.overdue : ""}`}>
      📅 {date}
    </span>
  );
}
