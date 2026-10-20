# Toolbox — Developer JSON Tools

A high-performance developer toolbox running 100% in the browser. Fast, private, forgiving with loose JSON, and lossless with arbitrary-precision numbers.

Designed strictly following the dark aesthetic in `DESIGN.md` and functional specifications in `PRD.md`.

## ✨ Features

### 1. Loose JSON Parsing & Formatter
- **Forgiving Parser:** Supports unquoted keys (`{a: 1}`), single-quoted strings, trailing commas (`{a: 1,}`), line comments (`//`), block comments (`/* */`), and loose numbers (`.5`, `5.`, `+42`, `0xFF`).
- **Lossless Numbers:** Numbers outside JavaScript's safe integer range (`12345678901234567890`) are preserved in their exact raw string representation and never lose precision.
- **Strict JSON Output:** Indentation options (2 spaces, 4 spaces, Tab, Minify), recursive key sorting, and live byte-size delta metrics.
- **Smart Format (Repair Mode):** Fixes missing commas between items/properties, unclosed braces/brackets/strings in truncated payloads, normalizes curly quotes, and produces a transparent repair report with truncation warnings.

### 2. Interactive Tree View & AST Search
- **AST-Based Tree:** Collapsible hierarchy showing container types and item counts (`object {3}`, `array [12]`).
- **Click-to-Copy Path:** Click any key or value to instantly copy its path to the clipboard and update the bottom path bar.
- **Path Formats:**
  - **JS:** `data.items[0].name`, `data["key.with.dot"]`
  - **JSONPath:** `$.data.items[0].name`, `$.data['key.with.dot']`
  - **Gjson:** `data.items.0.name`, `data.key\.with\.dot`
- **Expand Controls:** Expand All, Collapse All, and quick depth jump buttons (Depth 1, 2, 3, 4).
- **Custom AST Search (Ctrl+F / Cmd+F):** Intercepts native browser search to inspect collapsed/virtualized AST nodes. Supports searching in Keys, Values, or Both, with case-sensitivity and regex toggles, Enter/Shift+Enter navigation, auto-expanding parent nodes, scroll-into-view, and an interactive matches list drawer.

### 3. Compare / Diff
- **Text Diff:** Monaco side-by-side diff editor with "Normalize before compare" and key sorting to eliminate whitespace and syntax noise.
- **Semantic AST Diff:** Compares values semantically (e.g. `1`, `1.0`, and `1e0` count as equal, while differing 20-digit big ints are flagged as changed). Filter by Added, Removed, or Changed, and click any path to copy it.
- **Shared Input:** Import input from the JSON Formatter tool into the Left diff pane with one click.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm / pnpm / yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Production Build
```bash
npm run build
```

## 🛠️ Architecture

```
src/
  app/            Layout shell, sidebar navigation, keyboard shortcuts
  core/
    parse/        In-house loose JSON parser -> AST with raw numbers and source offsets
    path/         Path formatters (JS dot/bracket, JSONPath, Gjson)
    diff/         Semantic AST diff engine with numerical normalization
    format/       AST -> Strict JSON stringifier and size metrics
    repair/       Smart repair engine for broken/truncated payloads
    search/       AST search engine with scope, regex, and match capping
  components/     Monaco editor wrapper, diff editor, tree view, search bar, toast, error banner
  tools/
    json/         Shared input with Text and Tree view switch
    diff/         Text diff and semantic diff tool
  registry.ts     Self-contained tool registry
```

## 🔒 Privacy & Performance
- Zero network requests. User data never leaves local browser memory.
- No analytics or external tracking in v1.
- Custom recursive AST engine engineered for sub-second handling of multi-megabyte payloads.
# mine-tools
