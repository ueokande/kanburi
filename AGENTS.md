# Agent Guide

## Project goal

Build a desktop task management app that renders tasks as a list and persists data in a single Markdown file.

## Required tech

- Desktop shell: Tauri
- UI: React
- Language: TypeScript
- Package manager: pnpm

## Backend file constraints

- Single Markdown file is the only persistent store.
- The file name, location, and schema are not defined yet. Ask before assuming.

## Behavior rules

- Ask before inferring any data schema or file path for the Markdown backend.
- Do not introduce databases or additional storage formats.
- Keep all implementation steps aligned with Tauri + React + TypeScript + pnpm.
- Update README.md when requirements or usage expectations change.

## Open questions to confirm before scaffolding

- App name (use KANBAN.md as placeholder until confirmed).
- Markdown file name, location, and format/schema.
- Initial feature scope beyond a single task list view.
