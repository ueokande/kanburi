import styles from "./SettingsDialog.module.css";

interface Props {
  restoreOnStartup: boolean;
  disabled: boolean;
  onRestoreChange: (restore: boolean) => void;
  onClose: () => void;
}

export function SettingsDialog({
  restoreOnStartup,
  disabled,
  onRestoreChange,
  onClose,
}: Props) {
  return (
    <dialog
      open
      className={styles.settings}
      aria-labelledby="settings-title"
      ref={(dialog) => {
        if (dialog && !dialog.matches(":modal")) {
          dialog.close();
          dialog.showModal();
        }
      }}
      onCancel={onClose}
    >
      <h2 id="settings-title">Settings</h2>
      <label>
        <input
          type="checkbox"
          checked={restoreOnStartup}
          disabled={disabled}
          onChange={(event) => onRestoreChange(event.target.checked)}
        />{" "}
        Restore open files on startup
      </label>
      <p>
        Reopen your files and return to the selected tab next time. Board
        contents stay in your Markdown files.
      </p>
      <button type="button" onClick={onClose}>
        Done
      </button>
    </dialog>
  );
}
