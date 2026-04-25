import React, { createContext, useContext } from "react";
import styles from "./ExpandArea.module.css";

interface ExpandContextValue {
  expanded: boolean;
  onToggle: () => void;
}

const ExpandContext = createContext<ExpandContextValue>({
  expanded: false,
  onToggle: () => {},
});

interface ExpandAreaProps {
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function ExpandArea({ expanded, onToggle, children }: ExpandAreaProps) {
  return (
    <ExpandContext.Provider value={{ expanded, onToggle }}>
      <div className={styles.expandArea}>{children}</div>
    </ExpandContext.Provider>
  );
}

interface ExpandHeaderProps {
  children: React.ReactNode;
}

export function ExpandHeader({ children }: ExpandHeaderProps) {
  const { expanded, onToggle } = useContext(ExpandContext);
  return (
    <div className={styles.header} onClick={onToggle}>
      <div className={styles.headerContent}>{children}</div>
      <span className={styles.toggle} aria-hidden>
        {expanded ? "▲" : "▼"}
      </span>
    </div>
  );
}

interface ExpandDetailProps {
  children: React.ReactNode;
}

export function ExpandDetail({ children }: ExpandDetailProps) {
  const { expanded } = useContext(ExpandContext);
  if (!expanded) return null;
  return <div className={styles.detail}>{children}</div>;
}
