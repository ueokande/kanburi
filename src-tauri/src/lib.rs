use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Column {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub text: String,
    pub done: bool,
    pub column: String,
    pub description: Option<String>,
    pub due_date: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Board {
    pub columns: Vec<Column>,
    pub tasks: Vec<Task>,
}

impl Board {
    fn default() -> Self {
        Board {
            columns: vec![
                Column { name: "To Do".into() },
                Column { name: "In Progress".into() },
                Column { name: "Done".into() },
            ],
            tasks: vec![],
        }
    }
}

fn board_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("tasks.md"))
}

fn parse_board(content: &str) -> Board {
    let mut columns: Vec<Column> = Vec::new();
    let mut tasks: Vec<Task> = Vec::new();
    let mut current_column: Option<String> = None;
    let mut last_task_idx: Option<usize> = None;

    let mut lines = content.lines().peekable();

    while let Some(line) = lines.next() {
        if let Some(heading) = line.strip_prefix("## ") {
            let name = heading.trim().to_string();
            if !columns.iter().any(|c| c.name == name) {
                columns.push(Column { name: name.clone() });
            }
            current_column = Some(name);
            last_task_idx = None;
            continue;
        }

        let trimmed = line.trim();
        let (text_rest, done) = if let Some(r) = trimmed.strip_prefix("- [ ] ") {
            (r, false)
        } else if let Some(r) = trimmed.strip_prefix("- [x] ") {
            (r, true)
        } else {
            // Indented description line for the last task
            if line.starts_with("  ") && !trimmed.is_empty() {
                if let Some(idx) = last_task_idx {
                    let desc_line = line[2..].to_string();
                    match &mut tasks[idx].description {
                        Some(d) => {
                            d.push('\n');
                            d.push_str(&desc_line);
                        }
                        None => tasks[idx].description = Some(desc_line),
                    }
                }
            }
            continue;
        };

        let (text, id, due_date) = extract_meta(text_rest);
        let column = current_column.clone().unwrap_or_else(|| "To Do".into());

        last_task_idx = Some(tasks.len());
        tasks.push(Task { id, text, done, column, description: None, due_date });
    }

    if columns.is_empty() {
        return Board::default();
    }

    Board { columns, tasks }
}

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

fn hash_str(s: &str) -> u64 {
    s.bytes()
        .enumerate()
        .fold(0u64, |acc, (i, b)| {
            acc.wrapping_add((b as u64).wrapping_mul(i as u64 + 1))
        })
}

fn serialize_board(board: &Board) -> String {
    let mut out = String::from("# Tasks\n");

    for col in &board.columns {
        out.push_str(&format!("\n## {}\n\n", col.name));
        for task in board.tasks.iter().filter(|t| t.column == col.name) {
            let mark = if task.done { "x" } else { " " };
            let mut meta = format!("id:{}", task.id);
            if let Some(due) = &task.due_date {
                meta.push_str(&format!(" due:{}", due));
            }
            out.push_str(&format!("- [{}] {} <!-- {} -->\n", mark, task.text, meta));
            if let Some(desc) = &task.description {
                for dl in desc.lines() {
                    out.push_str(&format!("  {}\n", dl));
                }
            }
        }
    }
    out
}

#[tauri::command]
fn load_board(app: tauri::AppHandle) -> Result<Board, String> {
    let path = board_file_path(&app)?;
    if !path.exists() {
        return Ok(Board::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    Ok(parse_board(&content))
}

#[tauri::command]
fn save_board(app: tauri::AppHandle, board: Board) -> Result<(), String> {
    let path = board_file_path(&app)?;
    fs::write(&path, serialize_board(&board)).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_board, save_board])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
