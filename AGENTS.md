# Agent Guide

## Project goal

**Kanburi** — a native desktop Kanban board app that persists the entire board in a single, human-readable Markdown file. No database, no sync service, no account required.

## Required tech

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| UI | React 18 + TypeScript |
| Build tool | Vite |
| Package manager | pnpm |

## Behavior rules

- Do not introduce databases or additional storage formats. Markdown files are the only persistent store for board contents. Workspace preferences and open-file paths are stored separately in the OS application configuration directory (`settings.toml` only); never store board contents there.
- Keep all implementation steps aligned with Tauri + React + TypeScript + pnpm.
- Use CSS Modules (`.module.css`) for component styles. Global rules (`*`, `body`, `#root`) go in `src/global.css`, imported from `src/main.tsx`.
- Update `README.md` when requirements or usage-facing behavior changes.
- Use `@tauri-apps/plugin-dialog` (`confirm()`) for confirmation dialogs — `window.confirm()` is blocked in Tauri's WKWebView.

## Markdown schema

The board is serialized as:

```markdown
# Tasks

## Column name

- [ ] Task title #label1 #label2 @2025-05-10
  Optional description line.
  Can span multiple lines (2-space indent).
- [x] Completed task #label
```

- First nonempty H1 → optional document title (`Board.title`), shown in file tabs and the board header; preserve it on saves and use the filename when absent.
- `##` heading → column
- `- [ ]` / `- [x]` → task (todo / done)
- `#Word` inline → label
- `@YYYY-MM-DD` inline → due date
- Lines indented 2 spaces below a task → description (multi-line)
- Task IDs are derived at parse time (column + text + position); they are not stored in the file.

Parser: `src-tauri/src/markdown.rs`

## Tauri commands

| Command | Description |
|---|---|
| `resolve_file_path(path)` | Validate and canonicalize a Markdown path for tab identity |
| `load_file(path)` | Read and parse a `.md` file; record its independent modification baseline in `OpenFiles` |
| `save_current_board(path, board, force)` | Save to an explicit open file, with per-file conflict detection |
| `load_settings()` / `save_settings(settings)` | Read/write workspace preferences in the OS app configuration directory |

## Frontend structure

### Entry points

- `src/main.tsx` — React root; imports `global.css`
- `src/App.tsx` — workspace layout coordinator
- `src/components/Sidebar.tsx` / `FileTabs.tsx` / `SidebarResizeHandle.tsx` — file navigation and resizing
- `src/components/SettingsDialog.tsx` — workspace settings dialog
- `src/components/WorkspaceContent.tsx` / `FileBoard.tsx` — independent board providers and board presentation
- `src/components/AppIcon.tsx` — shared application logo from `resources/icon.svg`
- `src/hooks/useWorkspace.ts` — open/close/select files, startup restoration, ordered settings writes
- `src/global.css` — global reset, `body`, `#root`
- `src/types.ts` — shared TypeScript types (`Task`, `Column`, `Board`, `Status`, `LABEL_PALETTE`)
- `src/utils.ts` — pure helpers (e.g. `nextStatus`)

### Hooks (`src/hooks/`)

| Hook | Responsibility |
|---|---|
| `useBoard` | Tauri file I/O: `loadFile`, `saveBoard`; owns `Board` state |
| `useBoardStore` | In-memory board mutations (add/rename/delete columns, move tasks) |
| `useColumns` | Column rename UI state |
| `useTasks` | Task CRUD: add, update, delete, move, addLabel, removeLabel |
| `useDragDrop` | HTML5 drag-and-drop between columns |

### Components (`src/components/`)

| Component | Description |
|---|---|
| `WelcomeScreen` | Shown when no file is open; prompts user to open a file |
| `KanbanColumn` | Column shell: header + card list + add-task input |
| `ColumnHeader` | Column title (click to rename) + `PopupMenu` with delete |
| `AddTaskInput` | Ghost `+ Add task` label → input + Add button on click |
| `KanbanCard` | Card shell with drag, expand/collapse animation, status, meta |
| `ExpandArea` | Context-based expand system: `ExpandArea`, `ExpandHeader`, `ExpandDetail` |
| `StatusButton` | Checkbox toggle (todo ↔ done) |
| `DateBadge` | Read-only due date chip shown in collapsed card meta row |
| `DatePicker` | `react-day-picker` floating popover for editing due date |
| `LabelBadge` | Read-only label chip |
| `LabelEditor` | Inline label list with `+` circle button and pill input |
| `DescriptionInput` | Textarea for card description |
| `PopupMenu` | Generic `•••` trigger + dropdown shell; `PopupMenuItem` for items |

### PopupMenu pattern

Use `PopupMenu` + `PopupMenuItem` for any context menu. Callers inline their own action logic (including Tauri confirm dialogs) directly in `onClick`:

```tsx
<PopupMenu label="Card actions" className={styles.menuWrap}>
  <PopupMenuItem danger onClick={handleDelete}>Delete task</PopupMenuItem>
</PopupMenu>
```

- `className` — applied to the wrapper div (e.g. for hover fade-in)
- `triggerClassName` — overrides trigger button color (used by `ColumnHeader` for the gray column background)

## Backend structure (`src-tauri/src/`)

| File | Responsibility |
|---|---|
| `lib.rs` | Tauri app setup; registers plugins and commands |
| `commands.rs` | `load_file` and `save_current_board` Tauri commands |
| `markdown.rs` | Board parser and serializer |
| `models.rs` | Rust structs: `Board`, `Column`, `Task` |

## Build commands

```sh
pnpm tauri dev      # dev mode with hot-reload
pnpm run build      # frontend build only (tsc + vite)
pnpm tauri build    # production native app bundle
pnpm lint           # Biome lint
pnpm check          # Biome check + auto-fix
```

## CI/CD

Two GitHub Actions workflows in `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| `ci.yml` | Push to any branch | Frontend: tests + lint + build; Rust: check + clippy + tests |
| `release.yml` | Tag push `v*.*.*` | Builds native bundles on macOS/Linux/Windows; creates a draft GitHub Release |

To publish a release:
```sh
git tag v0.1.0
git push origin v0.1.0
```
The release is created as a **draft** — review and publish it manually on GitHub.

## Key configuration notes

### `dragDropEnabled: false` in `tauri.conf.json`

Tauri's native drag-drop handler intercepts all OS drag events before they reach the WebView, blocking the HTML5 DnD API. Setting `"dragDropEnabled": false` lets `dragover`/`drop` events fire normally inside the app. Required for Kanban card drag-and-drop.

### CSS Modules and global selectors

All component styles use CSS Modules. Global selectors (`*`, `body`, `#root`) **must not** be placed in `.module.css` files — they will be scoped/hashed and never match. Use `src/global.css` instead.

