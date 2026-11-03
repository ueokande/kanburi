use std::collections::HashMap;

use crate::models::{Board, Column, Task};

pub fn parse_board(content: &str) -> Board {
    let title = document_title(content);
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

        // Indented checkboxes belong to the description, not the board.
        if let Some(desc_line) = line.strip_prefix("  ") {
            if let Some(idx) = last_task_idx {
                match &mut tasks[idx].description {
                    Some(d) => {
                        d.push('\n');
                        d.push_str(desc_line);
                    }
                    None => tasks[idx].description = Some(desc_line.to_string()),
                }
            }
            continue;
        }

        let (rest, status) = if let Some(r) = line.strip_prefix("- [ ] ") {
            (r, "todo")
        } else if let Some(r) = line.strip_prefix("- [/] ") {
            (r, "todo")
        } else if let Some(r) = line.strip_prefix("- [x] ") {
            (r, "done")
        } else {
            continue;
        };

        let (text, labels, due_date) = parse_task_tokens(rest);
        let column = current_column.clone().unwrap_or_else(|| "To Do".into());
        if !columns.iter().any(|c| c.name == column) {
            columns.push(Column {
                name: column.clone(),
            });
        }
        let counter = col_task_counter.entry(column.clone()).or_insert(0);
        let id = format!(
            "{:x}-{}",
            hash_str(&format!("{}:{}:{}", column, text, counter)),
            tasks.len()
        );
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
        return Board {
            title,
            ..Board::default()
        };
    }
    Board {
        title,
        columns,
        tasks,
    }
}

/// Use the first nonempty H1 outside fenced code and task descriptions.
fn document_title(content: &str) -> Option<String> {
    let mut fence: Option<(char, usize)> = None;
    let mut previous = "";
    for line in content.lines() {
        let trimmed = line.trim();
        let marker = trimmed.chars().next().unwrap_or(' ');
        let count = trimmed.chars().take_while(|ch| *ch == marker).count();
        if matches!(marker, '`' | '~') && count >= 3 {
            if let Some((open, length)) = fence {
                if marker == open && count >= length && trimmed[count..].trim().is_empty() {
                    fence = None;
                }
            } else {
                fence = Some((marker, count));
            }
            previous = "";
            continue;
        }
        if fence.is_some() || line.starts_with([' ', '\t']) {
            previous = "";
            continue;
        }
        if let Some(rest) = line.strip_prefix('#') {
            if rest.starts_with([' ', '\t']) {
                let title = rest.trim();
                let without_hashes = title.trim_end_matches('#');
                let title = if without_hashes.is_empty() || without_hashes.ends_with([' ', '\t']) {
                    without_hashes.trim_end()
                } else {
                    title
                };
                if !title.is_empty() {
                    return Some(title.to_owned());
                }
            }
        }
        if !previous.is_empty() && !trimmed.is_empty() && trimmed.chars().all(|ch| ch == '=') {
            return Some(previous.to_owned());
        }
        previous = if trimmed.starts_with(['#', '-', '*', '>']) {
            ""
        } else {
            trimmed
        };
    }
    None
}

pub fn serialize_board(board: &Board) -> String {
    let mut out = board
        .title
        .as_ref()
        .map(|title| format!("# {title}\n"))
        .unwrap_or_default();

    for col in &board.columns {
        out.push_str(&format!("\n## {}\n\n", col.name));
        for task in board.tasks.iter().filter(|t| t.column == col.name) {
            let mark = match task.status.as_str() {
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
                for dl in desc.split('\n') {
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
    s.bytes().enumerate().fold(0u64, |acc, (i, b)| {
        acc.wrapping_add((b as u64).wrapping_mul(i as u64 + 1))
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_tasks_without_column_headings() {
        let board = parse_board("# Tasks\n- [ ] First\n- [x] Second\n");
        assert_eq!(board.tasks.len(), 2);
        assert_eq!(board.columns[0].name, "To Do");
        let reloaded = parse_board(&serialize_board(&board));
        assert_eq!(reloaded.tasks.len(), 2);
    }

    #[test]
    fn preserves_tasks_before_the_first_column() {
        let board = parse_board("- [ ] First\n## Done\n- [x] Second\n");
        assert_eq!(parse_board(&serialize_board(&board)).tasks.len(), 2);
    }

    #[test]
    fn nested_checkboxes_and_blank_lines_round_trip_as_description() {
        let content = "## Todo\n- [ ] Parent\n  - [ ] Nested\n  \n  More detail\n  \n";
        let board = parse_board(content);
        assert_eq!(board.tasks.len(), 1);
        assert_eq!(
            board.tasks[0].description.as_deref(),
            Some("- [ ] Nested\n\nMore detail\n")
        );
        let reloaded = parse_board(&serialize_board(&board));
        assert_eq!(reloaded.tasks[0].description, board.tasks[0].description);
    }

    #[test]
    fn ids_are_unique_even_when_title_hashes_collide() {
        // The previous weighted sum assigns the same ID to these two tasks.
        assert_eq!(hash_str("Todo:fa:0"), hash_str("Todo:ad:1"));
        let board = parse_board("## Todo\n- [ ] fa\n- [ ] ad\n");
        assert_ne!(board.tasks[0].id, board.tasks[1].id);
    }

    #[test]
    fn preserves_document_title_through_board_edits() {
        let mut board = parse_board("# Product roadmap\n\n## Planned\n- [ ] Build it\n");
        assert_eq!(board.title.as_deref(), Some("Product roadmap"));
        board.columns[0].name = "Next".into();
        let saved = serialize_board(&board);
        assert!(saved.starts_with("# Product roadmap\n"));
        assert_eq!(parse_board(&saved).title, board.title);
    }

    #[test]
    fn title_only_documents_keep_their_title() {
        let board = parse_board("# My board\n");
        assert_eq!(board.title.as_deref(), Some("My board"));
        assert!(!board.columns.is_empty());
    }

    #[test]
    fn no_heading_stays_untitled_after_saving() {
        let board = parse_board("## Todo\n- [ ] A task\n");
        assert!(board.title.is_none());
        assert!(parse_board(&serialize_board(&board)).title.is_none());
    }

    #[test]
    fn first_heading_supports_closing_hashes_and_setext() {
        assert_eq!(
            parse_board("# Roadmap ###\n# Other\n").title.as_deref(),
            Some("Roadmap")
        );
        assert_eq!(
            parse_board("Roadmap\n=======\n").title.as_deref(),
            Some("Roadmap")
        );
        assert_eq!(parse_board("# C#\n").title.as_deref(), Some("C#"));
        assert!(parse_board("# ###\n").title.is_none());
    }

    #[test]
    fn code_and_task_description_headings_are_not_document_titles() {
        let content = "```markdown\n# Code example\n```\n## Todo\n- [ ] A task\n  # Description\n";
        assert!(parse_board(content).title.is_none());
        assert_eq!(
            parse_board("~~~\n# Example\n~~~\n# Actual title\n")
                .title
                .as_deref(),
            Some("Actual title")
        );
    }
}
