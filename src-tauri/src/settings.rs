use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    pub restore_on_startup: bool,
    pub open_files: Vec<String>,
    pub active_file: Option<String>,
    pub sidebar_collapsed: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            restore_on_startup: true,
            open_files: Vec::new(),
            active_file: None,
            sidebar_collapsed: false,
        }
    }
}

fn read_settings(path: &Path) -> Result<Settings, String> {
    match fs::read(path) {
        Ok(bytes) => {
            serde_json::from_slice(&bytes).map_err(|e| format!("Could not read settings: {e}"))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Settings::default()),
        Err(e) => Err(e.to_string()),
    }
}

fn write_settings(path: &Path, settings: &Settings) -> Result<(), String> {
    let parent = path.parent().ok_or("Invalid settings path")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    // A same-directory temporary file keeps interrupted writes from corrupting settings.
    let temp = path.with_extension("json.tmp");
    let bytes = serde_json::to_vec_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&temp, bytes).map_err(|e| e.to_string())?;
    fs::rename(&temp, path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_settings(app: tauri::AppHandle) -> Result<Settings, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("settings.json");
    read_settings(&path)
}

#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, settings: Settings) -> Result<(), String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("settings.json");
    write_settings(&path, &settings)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_settings_enable_restore_by_default() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(
            read_settings(&dir.path().join("settings.json")).unwrap(),
            Settings::default()
        );
    }

    #[test]
    fn settings_round_trip_and_replace_previous_session() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("config/settings.json");
        let mut settings = Settings {
            open_files: vec!["/work.md".into(), "/personal.md".into()],
            active_file: Some("/personal.md".into()),
            ..Settings::default()
        };
        write_settings(&path, &settings).unwrap();
        assert_eq!(read_settings(&path).unwrap(), settings);
        settings.open_files.clear();
        settings.active_file = None;
        settings.restore_on_startup = false;
        write_settings(&path, &settings).unwrap();
        assert_eq!(read_settings(&path).unwrap(), settings);
    }

    #[test]
    fn corrupt_settings_are_reported_and_not_overwritten() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        fs::write(&path, "broken").unwrap();
        assert!(read_settings(&path).is_err());
        assert_eq!(fs::read_to_string(path).unwrap(), "broken");
    }
}
