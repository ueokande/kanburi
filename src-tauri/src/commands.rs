use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use tauri::Manager;

use crate::markdown::{parse_board, serialize_board};
use crate::models::Board;

/// Holds the path of the currently open file across commands.
pub struct CurrentFile(pub Mutex<Option<PathBuf>>);

/// Open a file at the given path, validate it, parse it, and store the path in
/// app state so that subsequent saves go to the same file.
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
    let board = parse_board(&content);
    *app.state::<CurrentFile>().0.lock().unwrap() = Some(pb);
    Ok(board)
}

/// Persist the board to whichever file was last opened via `load_file`.
#[tauri::command]
pub fn save_current_board(
    app: tauri::AppHandle,
    board: Board,
) -> Result<(), String> {
    let state = app.state::<CurrentFile>();
    let guard = state.0.lock().unwrap();
    let path = guard
        .as_ref()
        .ok_or_else(|| "No file is currently open.".to_string())?;
    fs::write(path, serialize_board(&board)).map_err(|e| e.to_string())
}
