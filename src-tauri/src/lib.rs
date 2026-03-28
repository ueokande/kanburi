pub mod commands;
pub mod markdown;
pub mod models;

use commands::{load_board, save_board};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_board, save_board])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
