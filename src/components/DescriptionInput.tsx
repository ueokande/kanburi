import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { open } from "@tauri-apps/plugin-shell";
import styles from "./DescriptionInput.module.css";

interface Props {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

export function DescriptionInput({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false);

  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>Description</span>
      {editing ? (
        <textarea
          // biome-ignore lint/a11y/noAutofocus: intentional — user just clicked to edit
          autoFocus
          className={styles.textarea}
          rows={4}
          value={value ?? ""}
          placeholder="Add a description…"
          onChange={(e) => onChange(e.target.value || undefined)}
          onBlur={() => setEditing(false)}
        />
      ) : (
        <div
          className={value ? styles.preview : styles.placeholder}
          onClick={() => setEditing(true)}
        >
          {value ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (href) open(href);
                    }}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {value}
            </ReactMarkdown>
          ) : (
            "Add a description…"
          )}
        </div>
      )}
    </div>
  );
}
