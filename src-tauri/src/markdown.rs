use std::collections::HashMap;

use crate::models::{Board, Column, Task};

pub fn parse_board(content: &str) -> Board {
    let mut columns: Vec<Column> = Vec::new();
    let mut tasks: Vec<Task> = Vec::new();
    let mut current_column: Option<String> = None;
    let mut last_task_idx: Option<usize> = None;
    let mut col_task_counter: HashMap<String, usize> = HashMap::new();

    for line in content.lines() {
        // Skip top-level heading
        if line.starts_with("# ") && !line.starts_with("## ") {
            continue;
        }

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
        let (rest, status) = if let Some(r) = trimmed.strip_prefix("- [ ] ") {
            (r, "todo")
        } else if let Some(r) = trimmed.strip_prefix("- [/] ") {
            (r, "in_progress")
        } else if let Some(r) = trimmed.strip_prefix("- [x] ") {
            (r, "done")
        } else {
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

        let (text, labels, due_date) = parse_task_tokens(rest);
        let column = current_column.clone().unwrap_or_else(|| "To Do".into());
        let counter = col_task_counter.entry(column.clone()).or_insert(0);
        let id = format!("{:x}", hash_str(&format!("{}:{}:{}", column, text, counter)));
        *counter += 1;

        last_task_idx = Some(tasks.len());
        tasks.push(Task {
            id,
            text,
            status: status.to_string(),
            column,
            labels,
            due_date,
            description: None,
        });
    }

    if columns.is_empty() {
        return Board::default();
    }
    Board { columns, tasks }
}

pub fn serialize_board(board: &Board) -> String {
    let mut out = String::from("# Tasks\n");

    for col in &board.columns {
        out.push_str(&format!("\n## {}\n\n", col.name));
        for task in board.tasks.iter().filter(|t| t.column == col.name) {
            let mark = match task.status.as_str() {
                "in_progress" => "/",
                "done" => "x",
                _ => " ",
            };
            let mut line = format!("- [{}] {}", mark, task.text);
            for label in &task.labels {
                line.push_str(&format!(" #{}", label));
            }
            if let Some(due) = &task.due_date {
                line.push_str(&format!(" @{}", due));
            }
            out.push_str(&line);
            out.push('\n');
            if let Some(desc) = &task.description {
                for dl in desc.lines() {
                    out.push_str(&format!("  {}\n", dl));
                }
            }
        }
    }
    out
}

/// Parse inline tokens: `#Label` → label, `@YYYY-MM-DD` → due_date, rest → text.
fn parse_task_tokens(rest: &str) -> (String, Vec<String>, Option<String>) {
    let mut labels: Vec<String> = Vec::new();
    let mut due_date: Option<String> = None;
    let mut text_parts: Vec<&str> = Vec::new();

    for token in rest.split_whitespace() {
        if let Some(label) = token.strip_prefix('#') {
            if !label.is_empty() {
                labels.push(label.to_string());
            }
        } else if let Some(date) = token.strip_prefix('@') {
            if !date.is_empty() {
                due_date = Some(date.to_string());
            }
        } else {
            text_parts.push(token);
        }
    }

    (text_parts.join(" "), labels, due_date)
}

fn hash_str(s: &str) -> u64 {
    s.bytes()
        .enumerate()
        .fold(0u64, |acc, (i, b)| {
            acc.wrapping_add((b as u64).wrapping_mul(i as u64 + 1))
        })
}
