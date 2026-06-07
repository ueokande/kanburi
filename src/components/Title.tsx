import type React from "react";
import { useState } from "react";
import { useComposing } from "../hooks/useComposing";
import type { Status } from "../types";
import styles from "./Title.module.css";

interface Props {
  text: string;
  status: Status;
  isExpanded: boolean;
  onUpdateText: (text: string) => void;
}

export function Title({ text, status, isExpanded, onUpdateText }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const composing = useComposing();

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(text);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== text) onUpdateText(trimmed);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !composing.isComposing(e)) {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape" && !composing.isComposing(e)) {
      setEditing(false);
    }
  }

  return (
    <div className={styles.row}>
      {editing ? (
        <input
          // biome-ignore lint/a11y/noAutofocus: intentional — user just clicked to edit
          autoFocus
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          {...composing.props}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span
          className={`${styles.title} ${status === "done" ? styles.done : ""}`}
          onClick={isExpanded ? startEdit : undefined}
          title={isExpanded ? "Click to rename" : undefined}
        >
          {text}
        </span>
      )}
    </div>
  );
}
