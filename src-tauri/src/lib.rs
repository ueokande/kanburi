pub mod commands;
pub mod markdown;
pub mod models;
pub mod session;

use commands::{close_file, load_file, save_board, OpenFiles};
use session::{load_session, save_session};
use std::collections::HashMap;
use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(OpenFiles(Mutex::new(HashMap::new())))
        .invoke_handler(tauri::generate_handler![
            load_file,
            close_file,
            save_board,
            load_session,
            save_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
