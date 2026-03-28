use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub text: String,
    pub done: bool,
    pub description: Option<String>,
    pub due_date: Option<String>,
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
    let mut tasks: Vec<Task> = Vec::new();
    let mut lines = content.lines().peekable();

    while let Some(line) = lines.next() {
        let trimmed = line.trim();
        let (text_rest, done) = if let Some(r) = trimmed.strip_prefix("- [ ] ") {
            (r, false)
        } else if let Some(r) = trimmed.strip_prefix("- [x] ") {
            (r, true)
        } else {
            continue;
        };

        let (text, id, due_date) = extract_meta(text_rest);

        // Collect following indented lines as the description.
        let mut desc_lines: Vec<String> = Vec::new();
        while let Some(&next) = lines.peek() {
            if next.starts_with("  ") && !next.trim().starts_with("- [") {
                desc_lines.push(next[2..].to_string());
                lines.next();
            } else {
                break;
            }
        }
        let description = if desc_lines.is_empty() {
            None
        } else {
            Some(desc_lines.join("\n"))
        };

        tasks.push(Task { id, text, done, description, due_date });
    }
    tasks
}

/// Parses `<!-- id:XYZ due:YYYY-MM-DD -->` from the end of a task line.
fn extract_meta(s: &str) -> (String, String, Option<String>) {
    const TAG_START: &str = " <!-- ";
    const TAG_END: &str = " -->";
    if let (Some(start), Some(_)) = (s.rfind(TAG_START), s.rfind(TAG_END)) {
        let inner = &s[start + TAG_START.len()..s.len() - TAG_END.len()];
        let text = s[..start].to_string();

        let id = inner
            .split_whitespace()
            .find_map(|kv| kv.strip_prefix("id:"))
            .unwrap_or("")
            .to_string();

        let due_date = inner
            .split_whitespace()
            .find_map(|kv| kv.strip_prefix("due:"))
            .map(str::to_string);

        let id = if id.is_empty() {
            format!("{:x}", hash_str(&text))
        } else {
            id
        };

        return (text, id, due_date);
    }
    let id = format!("{:x}", hash_str(s));
    (s.to_string(), id, None)
}

/// Minimal deterministic hash used only when no id is present in the file.
fn hash_str(s: &str) -> u64 {
    s.bytes()
        .enumerate()
        .fold(0u64, |acc, (i, b)| {
            acc.wrapping_add((b as u64).wrapping_mul(i as u64 + 1))
        })
}

fn serialize_tasks(tasks: &[Task]) -> String {
    let mut lines = vec!["# Tasks".to_string(), String::new()];
    for task in tasks {
        let mark = if task.done { "x" } else { " " };
        let mut meta = format!("id:{}", task.id);
        if let Some(due) = &task.due_date {
            meta.push_str(&format!(" due:{}", due));
        }
        lines.push(format!("- [{}] {} <!-- {} -->", mark, task.text, meta));
        if let Some(desc) = &task.description {
            for desc_line in desc.lines() {
                lines.push(format!("  {}", desc_line));
            }
        }
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
