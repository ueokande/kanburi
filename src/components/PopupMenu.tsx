import React, { useEffect, useRef, useState } from "react";
import styles from "./PopupMenu.module.css";

interface PopupMenuProps {
  label: string;
  className?: string;
  triggerClassName?: string;
  children: React.ReactNode;
}

export function PopupMenu({ label, className, triggerClassName, children }: PopupMenuProps) {
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

  return (
    <div
      ref={menuRef}
      className={`${styles.wrap} ${className ?? ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`${styles.trigger} ${triggerClassName ?? ""}`}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        •••
      </button>
      {open && (
        <div className={styles.dropdown}>{children}</div>
      )}
    </div>
  );
}

interface PopupMenuItemProps {
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function PopupMenuItem({ danger, onClick, children }: PopupMenuItemProps) {
  return (
    <button
      type="button"
      className={`${styles.item} ${danger ? styles.danger : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
