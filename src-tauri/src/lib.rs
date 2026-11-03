pub mod commands;
pub mod markdown;
pub mod models;
pub mod settings;

use commands::{load_file, resolve_file_path, save_current_board, OpenFiles};
use settings::{load_settings, save_settings};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .manage(OpenFiles::default())
        .invoke_handler(tauri::generate_handler![
            load_file,
            resolve_file_path,
            save_current_board,
            load_settings,
            save_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
