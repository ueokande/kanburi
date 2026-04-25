import { labelStyle } from "../utils";
import styles from "./LabelBadge.module.css";

interface Props {
  label: string;
}

export function LabelBadge({ label }: Props) {
  const { bg, text } = labelStyle(label);
  return (
    <span className={styles.badge} style={{ background: bg, color: text }}>
      #{label}
    </span>
  );
}
