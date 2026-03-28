use std::fs;
use std::path::PathBuf;

use tauri::Manager;

use crate::markdown::{parse_board, serialize_board};
use crate::models::Board;

pub fn board_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("tasks.md"))
}

#[tauri::command]
pub fn load_board(app: tauri::AppHandle) -> Result<Board, String> {
    let path = board_file_path(&app)?;
    if !path.exists() {
        return Ok(Board::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(parse_board(&content))
}

#[tauri::command]
pub fn save_board(app: tauri::AppHandle, board: Board) -> Result<(), String> {
    let path = board_file_path(&app)?;
    fs::write(&path, serialize_board(&board)).map_err(|e| e.to_string())
}
