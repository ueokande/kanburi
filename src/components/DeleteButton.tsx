import styles from "./DeleteButton.module.css";

interface Props {
  onClick: () => void;
}

export function DeleteButton({ onClick }: Props) {
  return (
    <button
      type="button"
      className={styles.btn}
      onClick={onClick}
      aria-label="Delete task"
    >
      🗑 Delete task
    </button>
  );
}
