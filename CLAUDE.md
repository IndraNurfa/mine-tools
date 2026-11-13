# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                       # Vite dev server
npm run build                     # tsc (type-check) && vite build
npm test                          # vitest run (all tests)
npx vitest run src/core/__tests__/parser.test.ts   # single test file
npx vitest run -t "name pattern"                   # single test by name
```

`src/tools/__tests__/smoke.test.tsx` server-renders every non-Monaco tool; add new tools to its list.

There is no lint script. `npm install` runs a `postinstall` that copies `node_modules/monaco-editor/min/vs` into `public/monaco/vs` (gitignored); Monaco is served same-origin, never from a CDN (see `src/monaco-setup.ts`, imported in `main.tsx` before any Monaco component).

## Product constraints (from PRD.md / README.md)

- 100% client-side: no analytics and no network requests of our own. The only outbound traffic is the API Client / cURL Runner sending the request the user explicitly builds (browser `fetch`, so normal CORS rules apply — no proxy). (PRD.md's "no persistence" non-goal is superseded: every tool persists its own input/options to localStorage, see below.)
- JSON input is "loose" (unquoted keys, single quotes, comments, trailing commas, `0xFF`, `.5`) and numbers must stay lossless — big ints are kept as raw strings, never round-tripped through JS `Number`.
- The parser is in-house; `json5` is a dev-only reference for tests. Do not add a runtime parsing dependency.
- UI follows the dark-only design in `DESIGN.md` (canvas `#101010`, single green accent `#00d992`, hairline borders, Inter + SF Mono, Tailwind).

## Architecture

- **Tool registry** (`src/registry.ts`): every tool is a `ToolItem` (id, name, group, route, lazy `component`). Adding a tool = a folder under `src/tools/<name>/` plus one registry entry. The sidebar, launcher and command palette are all driven by this registry (`groupTools()` groups by `group`).
- **Routing** (`src/app/router.ts`): a tiny custom History-API router (no react-router). `vercel.json` rewrites all paths to `index.html` for client-side routes.
- **`src/core/`** holds pure, UI-free logic, each with tests in `src/core/__tests__/`. The central data structure is the AST from `core/parse` (nodes carry raw number text and source offsets). `path`, `diff` (semantic diff with numeric normalization), `format` (AST → strict JSON, indent/minify/sort keys), `repair` (fixes truncated/broken payloads and produces a report), `search` (AST search), and `tree` (AST editing) all operate on that AST. Non-JSON tools (`list`, `text`, `uuid`, `encode`, `jwt`, `time`, `hash`, `regex`, `convert`) are also plain functions here (`hash` includes an in-house MD5 since WebCrypto lacks it; `convert` turns the AST into YAML/CSV/TS types; `csv` = table ops + CSV diff; `http` = cURL parser, code generators and the `sendRequest` engine behind both API tools).
- **`src/components/`**: shared UI — Monaco `Editor`/`DiffEditor` wrappers, `TreeView` + `TreeSearchBar` (custom AST search that intercepts Ctrl/Cmd+F because the tree is collapsed/virtualized), `CommandPalette`, `RepairModal`, `Toast`, `ErrorBanner`, and `ui.tsx` (shared pane header, segmented control, copy rows, paste/copy hooks, `FileButton` + `DropZone` for loading files — use these for new tools instead of re-styling). Layout rule: tool bodies must fill the width — use `Page` + `Panel` + `AutoGrid`/`Stat` from `ui.tsx` (multi-column from `xl:`), never wrap a tool in `max-w-*`; give inputs a useful sample default so no tool opens as an empty box.
- **Per-tool persistence** (`src/lib/storage.ts`): `usePersistentState(toolId, key, initial)` is a drop-in `useState` stored at `toolbox:<toolId>:<key>` (debounced, flushed on unmount, all access try/catch'd). `toolId` must equal the tool's registry `id`; the header's Reset button (shown only for registry entries with `resettable: true` — keep it for tools holding user content like inputs/requests, leave it off for tiny/regenerated ones) calls `clearStored(toolId)` and remounts the tool. Use it for inputs and options in every new tool, but not for secrets (e.g. the HMAC key) or regenerated output. The formatter's input lives in `App.tsx` (`sharedInput`) and is persisted under `formatter`.
- **`src/tools/`**: one component per tool that wires core functions to components. `FormatterTool` is the JSON text+tree view; `ApiClientTool` and `CurlTool` share `core/http` (`ApiRequest` model, `{{var}}` substitution via `VarsPanel`); the cURL Runner hands a parsed request to the API Client by writing its storage key and firing `popstate`. `DiffTool` can import its input from the formatter (shared input) and offers both Monaco text diff and semantic AST diff.
