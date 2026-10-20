# PRD: Developer Toolbox (JSON tools first)

Working title: Toolbox. A personal collection of small developer tools that run fully in the browser. The first release covers JSON only: formatter, tree view with click-to-copy path, and compare/diff. More tools get added later as separate modules.

## 1. Goals and non-goals

Goals
- Fast to open, fast to use, fast to build. Paste, get a result, copy it.
- Fully client-side. Nothing is uploaded or sent anywhere, because inputs may be real work payloads.
- Forgiving input. Loose JSON is treated exactly the same as strict JSON.
- Easy to extend. Adding a new tool is one folder plus one registry line.

Non-goals (v1)
- Backend, accounts, sync, or any persistence (no localStorage or IndexedDB for user data).
- PWA or offline install (possible later).
- Python dict normalization (None, True, False).
- JSON Schema validation, JSON to code generation, or any non-JSON tool.

## 2. Tech stack

- React + Vite + TypeScript, static build, deployable to any static host.
- Monaco editor (lazy-loaded) for input editors and the text diff view.
- Vitest for unit tests on the core logic.
- No runtime dependency for parsing. The parser is written in-house (see section 4), with `json5` allowed as a dev-only reference for test cases.

## 3. Architecture

Each tool is a self-contained module registered in one registry. The shell reads the registry, renders the sidebar, and routes to the selected tool.

```
src/
  app/            shell, layout, routing, theme
  core/
    parse/        loose JSON parser -> AST with raw number text and offsets
    path/         path formatters (js, jsonpath, gjson)
    diff/         semantic diff on AST
    format/       AST -> strict JSON string (indent, minify, sort keys)
  components/     editor wrapper, tree, copy button, toast, error banner
  tools/
    json/         text view + tree view, one shared input
    diff/
  registry.ts     [{ id, name, icon, component }]
```

Rule: tools never parse text themselves. They call `core/parse` and work on the AST. That keeps behavior identical across tools.

## 4. Core behavior

### 4.1 Loose JSON parsing
Accepted input, all treated the same as strict JSON:
- Unquoted keys (`{a: 1}`), double-quoted keys, and single-quoted keys.
- Single-quoted and double-quoted string values.
- Trailing commas in objects and arrays.
- Line comments (`//`) and block comments (`/* */`).
- Numbers with leading `+`, leading or trailing decimal point (`.5`, `5.`), and hex (`0xFF`), normalized to valid JSON numbers on output.

Not accepted in v1: `NaN`, `Infinity`, `undefined`, and Python literals. These give a clear parse error with line and column, not a silent change.

### 4.2 Lossless numbers
- Every number node keeps its original text (`raw`) in the AST.
- Numbers outside the safe integer range or with high precision must never pass through JS `Number`. Output uses the raw text, so `12345678901234567890` stays exactly that.
- Semantic diff compares numbers by decimal value (BigInt for integers, normalized decimal string otherwise), so `1`, `1.0`, and `1e0` count as equal, while two different big integers never collapse into one.

### 4.3 AST
Each node holds: type, value or children, key (if any), raw text for numbers, and start/end offsets in the source. Offsets let the app jump from a tree node to the exact place in the editor later.

### 4.4 Error reporting
Invalid input shows a banner with message, line, and column, and the editor marks the position. Messages must be readable (for example "Expected ':' after key at line 4, column 12"), not the browser's raw JSON.parse text.

### 4.5 Path formatting
A path is an array of keys and indexes from the root. One function turns it into a string in the chosen format.

| Format | Example | Notes |
|---|---|---|
| JS | `data.items[0].name` | Keys that are not valid identifiers use `["key.with.dot"]` |
| JSONPath | `$.data.items[0].name` | Special keys use `$['key']` with escaped quotes |
| Gjson | `data.items.0.name` | Special characters (`.`, `*`, `?`, `|`, `#`, `@`, `\`) escaped with a backslash |

Edge cases covered by tests: empty key, key with spaces, key with dots, key with quotes, numeric-looking keys, root value (empty path), nested arrays.

### 4.6 Smart format (repair mode)
Smart format is the parser in repair mode. It only runs when the user triggers it (a Smart format button), never automatically, and normal format stays strict about real errors.

What it repairs:
- Missing commas between array items or object members (for example values separated only by a newline).
- Unclosed `{`, `[` or string at the end of the input (truncated payloads), closed in the correct order.
- Trailing text after the root value, which is ignored.
- Curly quotes copied from docs or chat, treated as normal quotes.

Rules:
- Every fix is listed in a repair report with message, line, and column, so nothing changes silently. The output is clearly marked as repaired.
- If a truncation fix was applied, show a warning that the last value may be incomplete. A number cut off at the end (an amount or ID, say) must be flagged, not trusted.
- Ambiguous cases are not guessed. If the parser cannot repair with confidence, it reports the normal parse error.
- Repair keeps the lossless number rules from 4.2.

## 5. Shared input

Formatter and Tree are two views of one JSON tool. There is one input editor, and the output pane has a Text | Tree switch, so you paste once and flip between views without losing anything. Text view is the formatter output (6.1), tree view is the click-to-copy tree (6.2). The switch has a keyboard shortcut, and the last chosen view and path format are kept for the session.

Expand and collapse works in both views: in tree view through the expand all, collapse all, and depth controls (6.2), and in text view through Monaco code folding plus fold all and unfold all buttons. Diff has its own left and right editors, with a button to use the shared input as the left side.

## 6. Tools

### 6.1 Formatter
- Output as strict JSON by default (double quotes, no trailing commas, no comments).
- Options: indent 2, indent 4, tab, minify, sort keys (recursive).
- Copy output, clear input, paste from clipboard.
- Shows size before and after.
- Smart format button runs repair mode (4.6) and shows the repair report next to the output.

Acceptance
- `{a: 'x', b: [1,2,],}` formats to valid strict JSON.
- A big integer in the input appears unchanged in the output.
- Invalid input shows line and column, and the previous valid output is not silently replaced.

### 6.2 Tree view with click-to-copy path
- Collapsible tree rendered from the AST. Containers show type and child count (`object {3}`, `array [12]`).
- Clicking any key or value copies its path and shows it in a path bar plus a short toast.
- Dropdown for path format: JS, JSONPath, Gjson. The selection is kept for the session.
- Expand all, collapse all, expand to depth N.
- Large payloads: lazy expansion or virtualization. Target is a 5 MB JSON staying responsive.

Acceptance
- Clicking `name` inside `data.items[0]` copies `data.items[0].name` in JS format, `$.data.items[0].name` in JSONPath, and `data.items.0.name` in Gjson.
- Keys with special characters produce valid, escaped paths in all three formats.

Search (Ctrl+F on Windows and Linux, Cmd+F on Mac)
- In tree view the shortcut opens the app's own search bar and blocks the browser's default find. Browser find cannot see collapsed or virtualized nodes, so the search must run on the AST, not on the DOM.
- In text view the same shortcut opens Monaco's built-in find widget.
- Scope toggle: keys, values, or both (default both). Toggles for match case and regex.
- Number values are matched on their raw text, so big numbers are searchable exactly.
- Shows a match count ("3 of 17"). Enter goes to the next match, Shift+Enter to the previous, Esc closes the bar.
- Jumping to a match auto-expands its parents, scrolls it into view, and highlights it. The current match shows its path in the path bar, in the selected path format, with one-key copy.
- A matches list shows the path of every match, and clicking one jumps to it. This is the quick way to find where a key or value lives and grab its path.
- Search is debounced, and highlights are capped (for example at 1000 matches) with a "1000+ matches" label, so a 5 MB payload stays responsive.

Acceptance
- Searching `price` in values and keys finds every `price` key, expands the path to it, and copies `data.items[2].price` in JS format on the copy shortcut.
- Searching a value inside a collapsed branch still finds it and expands to it.
- Ctrl+F or Cmd+F never falls through to the browser's native find while the tree view is focused.

Later (not v1): type a path and jump to the matching node.

### 6.3 Compare / diff
Two tabs, text first.

Text diff
- Monaco side-by-side diff editor.
- Toggle "normalize before compare": formats both sides to strict JSON and optionally sorts keys, so key order and quote style do not create noise.

Semantic diff
- Walks both ASTs and lists changes as rows: path, type (added, removed, changed), old value, new value.
- Paths use the same path formatter and the same format dropdown as the tree.
- Arrays compare by index in v1.
- Filter by change type. Click a path to copy it.
- Summary line with counts of added, removed, and changed.

Acceptance
- `{a: 1}` versus `{"a": 1,}` shows zero differences.
- `data.items[2].price` changing from 10 to 12 shows as one changed row with that exact path.
- Two different 20-digit integers are reported as changed.

## 7. Non-functional requirements

- Privacy: no network requests carrying user data. No analytics in v1.
- Performance: parse and format a 1 MB payload in well under a second; the UI must not freeze on 5 MB.
- Bundle: Monaco is lazy-loaded so the shell opens fast.
- Accessibility: keyboard-reachable controls, visible focus, sensible labels.
- Browsers: current Chrome, Firefox, Safari, Edge.

## 8. Design and styling

All visual design (layout feel, spacing, typography, color, components, dark and light themes) is defined in `DESIGN.md`. The agent must read `DESIGN.md` before writing any UI and follow it over any styling guess made here. The app is dark only: no light theme and no theme toggle in v1, so DESIGN.md only needs to define a single dark palette. Monaco must use a dark theme to match. This PRD only defines function, not appearance.

## 9. Testing

Unit tests (Vitest) are required for `core/`:
- Parser: every accepted loose syntax, every rejected syntax with correct line and column, big number preservation.
- Path formatter: all edge cases in 4.5 across all three formats.
- Formatter: strict output, indent options, sort keys, minify.
- Search: key, value, and both scopes, case and regex toggles, matches inside collapsed branches, raw number matching, match ordering, and the match cap.
- Repair mode: missing commas, truncated input closed in the right order, trailing text ignored, curly quotes, correct report positions, truncation warning, and refusing ambiguous input.
- Semantic diff: added, removed, changed, nested, arrays, number equality rules.

## 10. Milestones

1. Shell and registry, `core/parse`, `core/format`, formatter tool, error reporting. Tests for parse and format.
2. Tree view, path formatter, click-to-copy, format dropdown, large payload handling.
3. Diff: text diff with normalize toggle, then semantic diff.
4. Polish: keyboard shortcuts, empty states, size warnings, README.

## 11. Decisions already made

- Static, client-side only, no persistence.
- React + Vite + TypeScript.
- Path formats: JS dot/bracket, JSONPath, Gjson.
- Diff: both text and semantic, text first.
- Loose JSON input accepted everywhere; strict JSON on output by default.
- Lossless big numbers from the start.
- No Python dict support.
- Shared input for formatter and tree; diff keeps its own left and right editors.
- Dark theme only, no light mode and no toggle in v1.
- Formatter and tree are one tool with a Text | Tree view switch; expand and collapse in both views.
- Smart format means repairing broken JSON (4.6), triggered manually, with a visible repair report.
- Ctrl+F or Cmd+F search by key and value in the tree (custom, AST-based), with a matches list showing paths; Monaco's find in text view.
