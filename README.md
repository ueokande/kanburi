# Kanburi

![Screenshot](./screenshot.png)

A native desktop Kanban board that saves everything in a single, human-readable Markdown file — no database, no account, no sync service required.

---

## Features

- Drag cards between columns
- Labels, due dates, and descriptions per card
- Label autocomplete from labels used on the current board
- All data persisted in a plain `.md` file you own

## Getting started

1. Launch **Kanburi**.
2. Click **Open file** and choose (or create) a `.md` file.
3. Your board loads from that file. Changes are saved automatically.

> **Tip:** Keep your board file in a cloud-synced folder (iCloud Drive, Dropbox, etc.) to access it from multiple machines.

## Markdown file format

```markdown
# Tasks

## To Do

- [ ] Add unit tests for auth module #backend #testing @2025-05-12
- [ ] Write API documentation #docs
- [ ] Investigate memory leak in worker pool #backend
  Observed in production since v1.4. Check thread cleanup on timeout.

## In Progress

- [ ] Refactor database connection pooling #backend #refactor
  Migrate from raw connections to a pooled client.
  Benchmark before and after with k6.
- [ ] Set up staging environment #devops @2025-05-10

## Done

- [x] Fix login redirect bug #frontend
- [x] Add CI pipeline #devops
  Runs lint, test, and build on every pull request.
- [x] Upgrade to Node 22 #maintenance
```

- Each `##` heading is a column.
- Each `- [ ]` / `- [x]` line is a task (`[x]` = done).
- `#Label` adds a label to the task (multiple allowed).
- `@YYYY-MM-DD` sets the due date.
- Lines indented with 2 spaces below a task are its description (multi-line supported). Indented checkboxes and blank lines stay in the description.
- Tasks before the first column heading are placed in a `To Do` column.
- Due dates are calendar dates in your local timezone.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, build instructions, and architecture notes.

## Label editing

Expand a card and use **+** to add a label, or click a label name to change it
on that card only. Suggestions come from the open board; no separate label
history or storage is created. Labels no longer used by any card stop appearing
in suggestions. Matching ignores case, but label names remain case-sensitive.

Use the arrow keys to select a suggestion and Enter to save, or click a suggestion.
For a new name, choose **Add #name** or press Enter without selecting a suggestion.
Escape, clicking outside, or leaving the field cancels the unfinished edit.
Labels already on the card cannot be added again, and names cannot contain
whitespace because Markdown stores labels as individual `#name` tokens.
