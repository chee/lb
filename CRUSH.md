# CRUSH.md

## Commands

# ⚙️ Tauri (Rust + frontend)
- Dev:      pnpm dev:tauri
- Build:    pnpm build:tauri

# 🕸 Littlebook (web)
- Dev:      cd littlebook && pnpm dev:littlebook
- Build:    cd littlebook && pnpm build:tauri:littlebook
- Serve:    node littlebook/build/serve.js

# 📦 Tests & Lint
- Lint (TS/JS):    pnpm lint
- Format:         pnpm format
- Typecheck:      pnpm typecheck
- Single test:    cd littlebook && pnpm test <test-file>

## Code Style Guidelines

### Formatting & Imports
- Use Prettier (.prettierrc.toml) for code formatting
- Sort imports: external modules first, then aliases, then relative paths
- Use single quotes for JS/TS strings, backticks for templates

### Naming
- Variables & functions: camelCase
- Types & Interfaces: PascalCase prefixed with `I` only if interfacing external libs
- React components: PascalCase

### Types & Error Handling
- Prefer explicit return types on exported functions
- Use `unknown` for catch clause vars, then narrow before use
- Handle async errors with `try/catch` or propagate via `Promise.reject`

### Rust (src-tauri)
- Follow Rust 2021 edition conventions
- Use snake_case for functions and variables
- Avoid unwraps; return `Result<T>` or use `?`

### Git & Branching
- Feature branches: `feature/<short-desc>`
- Bugfix branches: `fix/<short-desc>`
- Commit message style: imperative present tense

## Tooling & Rules
- Pre-commit hooks: runs lint and format
- There are no .cursor or Copilot rules in this repo
