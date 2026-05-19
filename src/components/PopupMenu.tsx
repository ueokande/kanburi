import type React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./PopupMenu.module.css";

interface PopupMenuProps {
  label: string;
  className?: string;
  triggerClassName?: string;
  children: React.ReactNode;
}

export function PopupMenu({ label, className, triggerClassName, children }: PopupMenuProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function handleTriggerClick() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((v) => !v);
  }

  return (
    <div
      ref={wrapRef}
      className={`${styles.wrap} ${className ?? ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${triggerClassName ?? ""}`}
        aria-label={label}
        onClick={handleTriggerClick}
      >
        •••
      </button>
      {open && createPortal(
        <div className={styles.dropdown} style={dropdownStyle}>{children}</div>,
        document.body,
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
