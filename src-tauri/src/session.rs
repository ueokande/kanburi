use std::fs;

use serde::{Deserialize, Serialize};
use tauri::Manager;

/// The set of files that were open (as tabs) the last time the app ran, so
/// they can be restored automatically on the next launch. This is the only
/// content stored in the local session file today.
#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct SessionState {
    #[serde(default)]
    pub open_paths: Vec<String>,
    #[serde(default)]
    pub active_path: Option<String>,
}

const SESSION_FILE_NAME: &str = "session.toml";

fn session_file_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    Ok(dir.join(SESSION_FILE_NAME))
}

/// Read the previously-saved session state (open tabs + active tab) from the
/// app's local config directory. Returns an empty session if no file exists
/// yet or if it can't be parsed.
#[tauri::command]
pub fn load_session(app: tauri::AppHandle) -> SessionState {
    let Ok(path) = session_file_path(&app) else {
        return SessionState::default();
    };
    let Ok(content) = fs::read_to_string(&path) else {
        return SessionState::default();
    };
    toml::from_str(&content).unwrap_or_default()
}

/// Persist which files are currently open (as tabs) and which one is active,
/// so they can be restored on the next launch.
#[tauri::command]
pub fn save_session(
    app: tauri::AppHandle,
    open_paths: Vec<String>,
    active_path: Option<String>,
) -> Result<(), String> {
    let path = session_file_path(&app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let state = SessionState {
        open_paths,
        active_path,
    };
    let content = toml::to_string_pretty(&state).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_state_round_trips_through_toml() {
        let state = SessionState {
            open_paths: vec!["/a/board.md".into(), "/b/other.md".into()],
            active_path: Some("/b/other.md".into()),
        };
        let serialized = toml::to_string_pretty(&state).expect("serialize");
        let deserialized: SessionState = toml::from_str(&serialized).expect("deserialize");
        assert_eq!(deserialized.open_paths, state.open_paths);
        assert_eq!(deserialized.active_path, state.active_path);
    }

    #[test]
    fn session_state_defaults_when_fields_missing() {
        let deserialized: SessionState = toml::from_str("").expect("deserialize empty");
        assert!(deserialized.open_paths.is_empty());
        assert!(deserialized.active_path.is_none());
    }
}
