import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useRef, useState } from "react";
import styles from "./WelcomeScreen.module.css";

interface Props {
  onOpenFile: () => void;
  onLoadFromPath: (path: string) => void;
  isLoading: boolean;
  error?: string;
}

export function WelcomeScreen({
  onOpenFile,
  onLoadFromPath,
  isLoading,
  error,
}: Props) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    getCurrentWindow()
      .onDragDropEvent((event) => {
        if (cancelled) return;
        const { type } = event.payload;
        if (type === "enter" || type === "over") {
          setIsDraggingOver(true);
        } else if (type === "leave") {
          setIsDraggingOver(false);
        } else if (type === "drop") {
          setIsDraggingOver(false);
          const paths = "paths" in event.payload ? event.payload.paths : [];
          const mdPath = (paths as string[]).find((p) =>
            p.toLowerCase().endsWith(".md"),
          );
          if (mdPath) onLoadFromPath(mdPath);
        }
      })
      .then((unlisten) => {
        if (cancelled) {
          unlisten();
        } else {
          unlistenRef.current = unlisten;
        }
      });

    return () => {
      cancelled = true;
      unlistenRef.current?.();
      unlistenRef.current = null;
    };
  }, [onLoadFromPath]);

  return (
    <div className={`${styles.root} ${isDraggingOver ? styles.dragging : ""}`}>
      <div className={styles.card}>
        <h1 className={styles.title}>KanbanMD</h1>
        <p className={styles.subtitle}>Open a Markdown file to get started.</p>

        <button
          type="button"
          className={styles.openBtn}
          onClick={onOpenFile}
          disabled={isLoading}
        >
          {isLoading ? "Opening…" : "Open file…"}
        </button>

        <p className={styles.hint}>or drop a .md file anywhere</p>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
