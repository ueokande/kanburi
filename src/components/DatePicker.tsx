import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { formatDueDate, isOverdue } from "../utils";
import styles from "./DatePicker.module.css";

interface Props {
  date: string | undefined;
  onChange: (value: string | undefined) => void;
}

function toDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DatePicker({ date, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | HTMLSpanElement>(null);
  const overdue = date ? isOverdue(date) : false;
  const selected = toDate(date);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !(triggerRef.current?.contains(e.target as Node))
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopoverPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen((v) => !v);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(undefined);
    setOpen(false);
  }

  function handleSelect(day: Date | undefined) {
    onChange(day ? toIso(day) : undefined);
    setOpen(false);
  }

  return (
    <div className={styles.row} onClick={(e) => e.stopPropagation()}>
      <span className={styles.title}>Due date</span>

      {date ? (
        <>
          <span
            ref={triggerRef as React.RefObject<HTMLSpanElement>}
            className={`${styles.dateLabel} ${overdue ? styles.overdue : ""}`}
            onClick={toggle}
          >
            {formatDueDate(date)}
          </span>
          <button
            type="button"
            className={styles.clearBtn}
            aria-label="Clear due date"
            onClick={clear}
          >
            ×
          </button>
        </>
      ) : (
        <button
          ref={triggerRef as React.RefObject<HTMLButtonElement>}
          type="button"
          className={styles.addBtn}
          onClick={toggle}
        >
          Set due date
        </button>
      )}

      {open && createPortal(
        <div
          ref={popoverRef}
          className={styles.popover}
          style={{ top: popoverPos.top, left: popoverPos.left }}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected ?? new Date()}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
