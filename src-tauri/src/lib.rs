use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub text: String,
    pub done: bool,
}

fn tasks_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("tasks.md"))
}

fn parse_tasks(content: &str) -> Vec<Task> {
    content
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if let Some(rest) = line.strip_prefix("- [ ] ") {
                let (text, id) = extract_id(rest);
                Some(Task { id, text, done: false })
            } else if let Some(rest) = line.strip_prefix("- [x] ") {
                let (text, id) = extract_id(rest);
                Some(Task { id, text, done: true })
            } else {
                None
            }
        })
        .collect()
}

/// Extracts an embedded `<!-- id:XYZ -->` comment, falling back to a generated id.
fn extract_id(s: &str) -> (String, String) {
    const TAG_START: &str = " <!-- id:";
    const TAG_END: &str = " -->";
    if let (Some(start), Some(end)) = (s.rfind(TAG_START), s.rfind(TAG_END)) {
        if start < end {
            let id = s[start + TAG_START.len()..end].to_string();
            let text = s[..start].to_string();
            return (text, id);
        }
    }
    // No id embedded — generate one from the text content (stable-ish).
    let id = format!("{:x}", md5_simple(s));
    (s.to_string(), id)
}

/// Minimal deterministic hash used only when no id is present in the file.
fn md5_simple(s: &str) -> u64 {
    s.bytes()
        .enumerate()
        .fold(0u64, |acc, (i, b)| acc.wrapping_add((b as u64).wrapping_mul(i as u64 + 1)))
}

fn serialize_tasks(tasks: &[Task]) -> String {
    let mut lines = vec!["# Tasks".to_string(), String::new()];
    for task in tasks {
        let mark = if task.done { "x" } else { " " };
        lines.push(format!(
            "- [{}] {} <!-- id:{} -->",
            mark, task.text, task.id
        ));
    }
    lines.join("\n") + "\n"
}

#[tauri::command]
fn load_tasks(app: tauri::AppHandle) -> Result<Vec<Task>, String> {
    let path = tasks_file_path(&app)?;
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(parse_tasks(&content))
}

#[tauri::command]
fn save_tasks(app: tauri::AppHandle, tasks: Vec<Task>) -> Result<(), String> {
    let path = tasks_file_path(&app)?;
    let content = serialize_tasks(&tasks);
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_tasks, save_tasks])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
