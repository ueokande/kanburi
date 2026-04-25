import type { Status } from "../types";
import styles from "./StatusButton.module.css";

const STATUS_ICON: Record<Status, string> = {
  todo: "☐",
  done: "☑",
};

interface Props {
  status: Status;
  onClick: () => void;
}

export function StatusButton({ status, onClick }: Props) {
  return (
    <button
      type="button"
      className={`${styles.btn} ${styles[status]}`}
      aria-label={`Status: ${status}. Click to advance.`}
      onClick={onClick}
    >
      {STATUS_ICON[status]}
    </button>
  );
}
