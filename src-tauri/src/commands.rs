use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::SystemTime;

use tauri::Manager;

use crate::markdown::{parse_board, serialize_board};
use crate::models::Board;

/// Each open file has its own conflict baseline. Saves always name their target.
#[derive(Default)]
pub struct OpenFiles(pub Mutex<HashMap<PathBuf, Option<SystemTime>>>);

#[tauri::command]
pub fn resolve_file_path(path: String) -> Result<String, String> {
    let path = fs::canonicalize(path).map_err(|e| e.to_string())?;
    if !path
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| e.eq_ignore_ascii_case("md"))
    {
        return Err("Only .md files are supported.".into());
    }
    path.into_os_string()
        .into_string()
        .map_err(|_| "The file path is not valid UTF-8.".into())
}

#[tauri::command]
pub fn load_file(app: tauri::AppHandle, path: String) -> Result<Board, String> {
    let path = PathBuf::from(resolve_file_path(path)?);
    let state = app.state::<OpenFiles>();
    let mut files = state.0.lock().map_err(|e| e.to_string())?;
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mtime = fs::metadata(&path).and_then(|m| m.modified()).ok();
    files.insert(path, mtime);
    Ok(parse_board(&content))
}

pub(crate) fn mtime_conflict(stored: Option<SystemTime>, path: &Path) -> bool {
    let current = fs::metadata(path).and_then(|m| m.modified()).ok();
    current != stored
}

fn save_open_board(
    files: &mut HashMap<PathBuf, Option<SystemTime>>,
    path: &Path,
    board: &Board,
    force: bool,
) -> Result<(), String> {
    let stored = files.get(path).ok_or("The file is not open.")?;
    if !force && mtime_conflict(*stored, path) {
        return Err("CONFLICT".into());
    }
    fs::write(path, serialize_board(board)).map_err(|e| e.to_string())?;
    files.insert(
        path.to_path_buf(),
        fs::metadata(path).and_then(|m| m.modified()).ok(),
    );
    Ok(())
}

#[tauri::command]
pub fn save_current_board(
    app: tauri::AppHandle,
    path: String,
    board: Board,
    force: bool,
) -> Result<(), String> {
    let state = app.state::<OpenFiles>();
    let mut files = state.0.lock().map_err(|e| e.to_string())?;
    save_open_board(&mut files, Path::new(&path), &board, force)
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

    #[test]
    fn saves_target_one_file_without_affecting_another() {
        let first = write_temp_md("## First\n");
        let second = write_temp_md("## Second\n");
        let mut files = HashMap::from([
            (first.path().to_path_buf(), current_mtime(first.path())),
            (second.path().to_path_buf(), current_mtime(second.path())),
        ]);
        let updated = parse_board("## First\n- [ ] Updated\n");
        save_open_board(&mut files, first.path(), &updated, false).unwrap();
        assert!(fs::read_to_string(first.path())
            .unwrap()
            .contains("Updated"));
        assert_eq!(fs::read_to_string(second.path()).unwrap(), "## Second\n");
        let second_update = parse_board("## Second\n- [ ] Other edit\n");
        save_open_board(&mut files, second.path(), &second_update, false).unwrap();
        assert!(fs::read_to_string(first.path())
            .unwrap()
            .contains("Updated"));
    }

    #[test]
    fn conflicts_are_tracked_independently_and_unknown_files_cannot_be_saved() {
        let first = write_temp_md("## First\n");
        let second = write_temp_md("## Second\n");
        let mut files = HashMap::from([
            (first.path().to_path_buf(), current_mtime(first.path())),
            (second.path().to_path_buf(), current_mtime(second.path())),
        ]);
        thread::sleep(Duration::from_millis(10));
        fs::write(first.path(), "external change").unwrap();
        let board = Board::default();
        assert_eq!(
            save_open_board(&mut files, first.path(), &board, false).unwrap_err(),
            "CONFLICT"
        );
        save_open_board(&mut files, second.path(), &board, false).unwrap();
        assert_eq!(fs::read_to_string(first.path()).unwrap(), "external change");
        save_open_board(&mut files, first.path(), &board, true).unwrap();
        assert!(save_open_board(&mut HashMap::new(), first.path(), &board, true).is_err());
    }
}
