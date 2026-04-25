import { confirm } from "@tauri-apps/plugin-dialog";
import { useEffect, useRef, useState } from "react";
import styles from "./CardMenu.module.css";

interface Props {
  onDelete: () => void;
}

export function CardMenu({ onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  async function handleDelete() {
    setOpen(false);
    const ok = await confirm("Delete this task?", {
      title: "Delete task",
      kind: "warning",
    });
    if (ok) onDelete();
  }

  return (
    <div
      ref={menuRef}
      className={styles.wrap}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-label="Card actions"
        onClick={() => setOpen((v) => !v)}
      >
        •••
      </button>
      {open && (
        <div className={styles.dropdown}>
          <button
            type="button"
            className={`${styles.item} ${styles.danger}`}
            onClick={handleDelete}
          >
            Delete task
          </button>
        </div>
      )}
    </div>
  );
}
