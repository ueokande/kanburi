use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::SystemTime;

use tauri::Manager;

use crate::markdown::{parse_board, serialize_board};
use crate::models::Board;

/// Holds the path and last-known modification time of the currently open file.
pub struct CurrentFileState {
    pub path: Option<PathBuf>,
    pub mtime: Option<SystemTime>,
}

pub struct CurrentFile(pub Mutex<CurrentFileState>);

/// Open a file at the given path, validate it, parse it, and store the path and
/// mtime in app state so that subsequent saves go to the same file.
#[tauri::command]
pub fn load_file(
    app: tauri::AppHandle,
    path: String,
) -> Result<Board, String> {
    let pb = PathBuf::from(&path);
    if pb.extension().and_then(|e| e.to_str()) != Some("md") {
        return Err("Only .md files are supported.".into());
    }
    let content = fs::read_to_string(&pb).map_err(|e| e.to_string())?;
    let mtime = fs::metadata(&pb)
        .and_then(|m| m.modified())
        .ok();
    let board = parse_board(&content);
    let state = app.state::<CurrentFile>();
    let mut guard = state.0.lock().unwrap();
    guard.path = Some(pb);
    guard.mtime = mtime;
    Ok(board)
}

/// Returns true if the file at `path` has a different modification time than
/// `stored`, meaning an external process has changed it since it was last
/// loaded or saved. Returns false when both are `None` (new file) or when
/// the timestamps match exactly.
pub(crate) fn mtime_conflict(stored: Option<SystemTime>, path: &std::path::Path) -> bool {
    let current = fs::metadata(path).and_then(|m| m.modified()).ok();
    current != stored
}

/// Persist the board to whichever file was last opened via `load_file`.
///
/// If `force` is false, the command first checks whether the file's current
/// modification time matches the one recorded at load/last-save time. If they
/// differ it means an external process changed the file, and the command returns
/// `Err("CONFLICT")` instead of overwriting. Pass `force: true` to skip this
/// check and overwrite unconditionally.
#[tauri::command]
pub fn save_current_board(
    app: tauri::AppHandle,
    board: Board,
    force: bool,
) -> Result<(), String> {
    let state = app.state::<CurrentFile>();
    let mut guard = state.0.lock().unwrap();
    let path = guard
        .path
        .as_ref()
        .ok_or_else(|| "No file is currently open.".to_string())?
        .clone();

    if !force && mtime_conflict(guard.mtime, &path) {
        return Err("CONFLICT".to_string());
    }

    fs::write(&path, serialize_board(&board)).map_err(|e| e.to_string())?;

    guard.mtime = fs::metadata(&path)
        .and_then(|m| m.modified())
        .ok();

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::thread;
    use std::time::Duration;
    use tempfile::NamedTempFile;

    fn write_temp_md(content: &str) -> NamedTempFile {
        let mut f = tempfile::Builder::new()
            .suffix(".md")
            .tempfile()
            .expect("failed to create temp file");
        f.write_all(content.as_bytes()).expect("failed to write");
        f.flush().expect("failed to flush");
        f
    }

    fn current_mtime(path: &std::path::Path) -> Option<SystemTime> {
        fs::metadata(path).and_then(|m| m.modified()).ok()
    }

    #[test]
    fn mtime_conflict_returns_false_when_mtime_matches() {
        let f = write_temp_md("# Tasks\n");
        let stored = current_mtime(f.path());
        assert!(!mtime_conflict(stored, f.path()));
    }

    #[test]
    fn mtime_conflict_returns_true_when_file_is_modified() {
        let f = write_temp_md("# Tasks\n");
        let stored = current_mtime(f.path());

        // Sleep to ensure the filesystem timestamp advances.
        thread::sleep(Duration::from_millis(10));
        fs::write(f.path(), "# Tasks\n\n## New Column\n").expect("write failed");

        assert!(mtime_conflict(stored, f.path()));
    }

    #[test]
    fn mtime_conflict_returns_true_when_stored_is_none_and_file_exists() {
        let f = write_temp_md("# Tasks\n");
        // stored = None means we never recorded an mtime; the file has one → conflict.
        assert!(mtime_conflict(None, f.path()));
    }

    #[test]
    fn mtime_conflict_returns_false_when_both_none() {
        // Non-existent path: metadata fails → current = None, stored = None → no conflict.
        let path = std::path::Path::new("/nonexistent/path/that/does/not/exist.md");
        assert!(!mtime_conflict(None, path));
    }

    #[test]
    fn mtime_conflict_returns_true_when_stored_some_but_file_missing() {
        let stored = Some(SystemTime::now());
        let path = std::path::Path::new("/nonexistent/path/that/does/not/exist.md");
        // current = None (file gone), stored = Some → they differ → conflict.
        assert!(mtime_conflict(stored, path));
    }
}
