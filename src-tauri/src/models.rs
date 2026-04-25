use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Column {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Task {
    pub id: String,
    pub text: String,
    /// "todo" | "done"
    pub status: String,
    pub column: String,
    pub labels: Vec<String>,
    pub due_date: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Board {
    pub columns: Vec<Column>,
    pub tasks: Vec<Task>,
}

impl Default for Board {
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
