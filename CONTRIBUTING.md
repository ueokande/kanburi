# Contributing to Kanburi

Thank you for your interest in contributing! This document covers development setup, build commands, and architecture notes.

---

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| UI | React 18 + TypeScript |
| Build tool | Vite |
| Package manager | pnpm |

---

## Prerequisites

Install all required tools via [mise](https://mise.jdx.dev):

```sh
mise install   # installs Node LTS, pnpm, and Rust stable (see .mise.toml)
```

---

## Development

### Run in dev mode

```sh
pnpm tauri dev
```

Starts the Vite dev server and opens the Tauri window with hot-reload.

### Production build

```sh
pnpm tauri build
```

Produces a signed, installable native app bundle in `src-tauri/target/release/bundle/`.

### Frontend only (browser)

```sh
pnpm dev
```

Runs the React frontend in a browser. Tauri APIs are unavailable; file I/O won't work.

---

## Project structure

```
src/                  React + TypeScript frontend
  components/         UI components
  hooks/              Custom React hooks (useTasks, useBoard, …)
  types.ts            Shared TypeScript types
  global.css          Global CSS reset and root styles
src-tauri/            Rust backend
  src/
    commands.rs       Tauri commands (load_file, save_current_board)
    markdown.rs       Markdown parser / serializer
    models.rs         Rust data models
  capabilities/       Tauri permission declarations
  tauri.conf.json     App configuration
```

---

## Architecture notes

### `dragDropEnabled: false` in `tauri.conf.json`

The window option `"dragDropEnabled": false` is intentionally set. Tauri's native drag-drop handler intercepts **all** OS-level drag events before they reach the WebView, which prevents the HTML5 Drag and Drop API (`dragover` / `drop` events) from firing inside the app. Disabling it lets the WebView handle drag events normally, which is required for card drag-and-drop on the Kanban board.

With this setting, OS file drops (e.g. dragging a `.md` file from Finder) still reach the WebView as standard browser `drop` events via `event.dataTransfer.files`. The only thing disabled is Tauri's own `tauri://drag-drop` event API, which is not used by this app.

Upstream tracking issue: [tauri-apps/tauri#14373](https://github.com/tauri-apps/tauri/issues/14373)

### Markdown schema

Kanburi persists the board as a structured Markdown file. The parser lives in `src-tauri/src/markdown.rs`.

```markdown
# Tasks

## To Do

- [ ] Task title #label1 #label2 @2025-05-10
  Optional description (indented 2 spaces).
  Can span multiple lines.
- [ ] Another task

## Done

- [x] Completed task #label
```

- Each `##` heading maps to a column.
- Each `- [ ]` / `- [x]` line is a task.
- `#Label` — adds a label (multiple allowed, space-separated).
- `@YYYY-MM-DD` — sets the due date.
- Lines indented with 2 spaces below a task are its description (multi-line supported).
- Task IDs are derived at parse time from column + text + position; they are not stored in the file.
