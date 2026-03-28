# KanbanMD

A native desktop task management app backed by a single Markdown file — no database, no sync service.

## Features

- Simple flat task list with add, complete, and delete
- All data persisted in a human-readable Markdown file
- Native desktop app via Tauri

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| UI | React 18 + TypeScript |
| Build tool | Vite |
| Package manager | pnpm |

## Getting started

### Prerequisites

Install tools via [mise](https://mise.jdx.dev):

```sh
mise install   # installs Node LTS, pnpm, Rust stable
```

### Dev mode

```sh
pnpm tauri dev
```

### Production build

```sh
pnpm tauri build
```

## Data storage

Tasks are stored in:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/com.kanbanmd.app/tasks.md` |
| Linux | `~/.local/share/com.kanbanmd.app/tasks.md` |
| Windows | `%APPDATA%\com.kanbanmd.app\tasks.md` |

The file path is configurable — update `tasks_file_path()` in `src-tauri/src/lib.rs`.

### Markdown schema

```markdown
# Tasks

- [ ] Buy groceries <!-- id:1234567890 -->
- [x] Write README <!-- id:9876543210 -->
```

Each task line uses the standard GFM checkbox syntax. A `<!-- id:… -->` comment embeds a stable ID to survive reordering.