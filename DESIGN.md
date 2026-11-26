# Design System: Toolbox

## Overview

Toolbox is an internal set of developer utilities. People open it, paste something, read the result and copy it, many times a day, on desktop and tablet. The design serves that loop: dense, calm, keyboard-friendly and fast. It keeps the Voltagent look (near-black canvas, one green accent, hairline borders, Inter + SF Mono) without its marketing-page patterns.

**Principles**

1. **Content first.** Tool bodies fill the width. Chrome stays small and quiet.
2. **One accent.** Green marks what to do and where you are. Other hues only report status.
3. **Hairlines, not shadows.** Borders separate surfaces.
4. **Instant.** Frequent and keyboard-driven actions never animate.
5. **Dark only.** There is no light mode and no theme toggle.

Tokens live in `tailwind.config.js`. This document is the target; [Not yet in code](#not-yet-in-code) lists where the app still differs.

## Colors

### Core

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#101010` | Page and editor background |
| `canvas-soft` | `#1a1a1a` | Inputs, pane headers, panels, hovered rows |
| `hairline` | `#3d3a39` | 1 px borders and dividers. **Never readable text** (1.7:1 on canvas); decorative glyphs only |
| `ink` | `#f2f2f2` | Default text |
| `ink-strong` | `#ffffff` | Page title and large values |
| `body` | `#d0d0d0` | Secondary text |
| `mute` | `#9ca3af` | Labels, hints, inactive icons. The dimmest text allowed |
| `primary` | `#00d992` | Accent (see below) |
| `primary-soft` | `#2fd6a1` | Primary hover, focus ring, inline code, numbers |

### Where green is allowed

- The primary action's fill, with `canvas` text.
- Selected and active states, as a tint: `bg-primary/15 text-primary`.
- The focus ring and a focused input's border.
- Success and "live" feedback.
- Syntax colour for JSON keys and keywords.

Never use it for paragraphs, descriptions or decoration.

### Status colors

These carry meaning only. Always pair the color with a word, symbol or number.

| Role | Tailwind | Use |
| --- | --- | --- |
| Success | `primary` | Valid, added, 2xx, GET |
| Danger | `red-400` | Errors, removed, destructive hover, 4xx/5xx, DELETE |
| Warning | `amber-400` | Changed, truncated data, POST, 3xx |
| Info | `blue-400` | PUT and informational badges |
| Extra | `purple-400` | PATCH only |

Tinted status surfaces use the same hue at `/10` for the fill and `/40` for the border.

## Typography

- **Inter** for the interface. Weights 400, 500 and 600 only.
- **SF Mono** (fallback JetBrains Mono, Menlo, Consolas) for anything typed, pasted or counted: inputs, outputs, paths, code, numbers. Use `tabular-nums` for values that update or line up.
- Both faces are served by the app or the system. No third-party font requests.

| Role | Class | Size | Use |
| --- | --- | --- | --- |
| Label | `text-[11px] font-semibold uppercase tracking-[1.5px] text-mute` | 11 | Pane and group titles. Use the `Label` component |
| Hint | `text-[11px]` | 11 | Keyboard hints, badges. The smallest size allowed |
| Control | `text-xs` | 12 | Buttons, toolbar controls, navigation |
| Content | `text-sm` | 14 | Inputs, outputs, page title (600) |
| Code | Monaco `fontSize: 13` | 13 | Editors only |
| Heading | `text-lg font-semibold` | 18 | Launcher title, empty states |
| Value | `text-xl font-semibold font-mono` | 20 | `Stat` tiles |
| Hero value | `text-2xl font-mono` | 24 | The single answer a tool exists to show |

Sentence case everywhere except labels.

## Layout

### Spacing

4 px base. Prefer 4, 8, 12, 16 and 24 px. Panels use 16 px padding; pages use 20 px, 24 px from `lg`.

### Fixed sizes

| Element | Size |
| --- | --- |
| App header | 56 px |
| Pane header / toolbar | 40 px minimum, grows when it wraps |
| Sidebar | 256 px expanded, 56 px icon rail |
| Control height | 28 px with a mouse, 40 px on `pointer: coarse` |

### Responsive rules

The smallest supported width is **768 px** (tablet). There is no phone layout.

| Width | Behaviour |
| --- | --- |
| 768 – 1023 | Icon rail. Header description hidden |
| 1024 – 1279 | Icon rail. Two-pane tools sit side by side |
| 1280 and up | Sidebar expanded unless the user collapsed it |

- Toolbars use `flex-wrap`. Nothing may be pushed off-screen.
- The tool name never truncates; the description does.
- Editor comparisons stay side by side at every width.
- Use `Page`, `Panel`, `AutoGrid` and `Stat`. Never wrap a tool in `max-w-*`.
- Every tool opens with a useful sample, never an empty box.

## Shape and depth

| Token | Value | Use |
| --- | --- | --- |
| `rounded-xs` | 4 px | Kbd, chips, tree rows, segments inside a switch |
| `rounded-sm` | 6 px | Buttons, inputs, switches |
| `rounded-md` | 8 px | Panels, cards, dialogs |
| `rounded-pill` | 9999 px | Status tags and dots |

Always name the size; bare `rounded` is not used.

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | 1 px `hairline` | Panels, cards, buttons |
| Glow | `shadow-inset-glow` | Active navigation item, selected launcher card |
| Modal | `shadow-modal-stack` + `bg-black/60` backdrop | Dialogs, palette, toasts |

## Components

Use the shared components in `src/components/ui.tsx`. Add a variant there before styling a new button or input by hand.

### Buttons

| Variant | Style | Rule |
| --- | --- | --- |
| Primary | `bg-primary text-canvas font-semibold`, hover `bg-primary-soft` | The one main action (Send, Copy result, Apply). **At most one per view** |
| Secondary | `border-hairline bg-canvas-soft text-mute`, hover `text-ink border-primary/40` | Everything else |
| Icon | No border, `text-mute`, hover `bg-canvas-soft` | Pane actions. Needs `title` and an accessible name |
| Danger | Secondary, hover `text-red-400` | Clear, delete, reset |

### Segmented switch

Hairline container. The selected segment is **tinted** (`bg-primary/15 text-primary`), never solid, so it can't be mistaken for the primary action. Set `aria-pressed` on each segment.

### Inputs

`bg-canvas-soft`, 1 px `hairline`, `rounded-sm`, monospace; focus turns the border `primary`. Large text areas sit flush on `canvas`. Every input has a visible label or an `aria-label`. Tokens, passwords and cookies use `SecretInput`.

### Panes

A pane is a header (label left, actions right) above a body that fills the remaining height and scrolls on its own.

### Feedback

- **Copy:** every output can be copied, and a toast confirms it.
- **Errors:** next to the input that caused them, in `red-400`, saying what to fix. Keep the last good output where possible.
- **Destructive actions:** confirm before deleting something the user typed.
- **Crashes:** `ToolErrorBoundary` offers reload and reset.

## Interaction states

| State | Rule |
| --- | --- |
| Hover | Color or border only, and only on devices that can hover (`hoverOnlyWhenSupported`). Nothing may be *reachable* only by hover |
| Press | `active:scale-[0.97]` on buttons |
| Focus | 2 px `primary-soft` inset ring on `:focus-visible` (defined in `index.css`) |
| Selected | Green tint plus a second cue (border, dot or `aria-current`) |
| Disabled | 40% opacity and `disabled` |

## Motion

| Surface | Motion |
| --- | --- |
| Command palette, tool switching, tree expand, any keyboard action | None |
| Hover and selection color | `transition-colors`, 150 ms |
| Button press | Transform, 120 ms ease-out |
| Dialog | Fade and `scale(0.97)` to 1, 180 ms in. Closes instantly |
| Toast | Fade and 8 px rise, 180 ms in, 120 ms out |

Ease-out curve: `cubic-bezier(0.23, 1, 0.32, 1)`. Never `transition-all`. Under `prefers-reduced-motion`, keep fades and drop movement.

## Accessibility

- Everything works with a keyboard. Clickable things are `button` or `a`.
- Dialogs trap focus, close on Escape and restore focus (`useDialogFocus`).
- Text meets 4.5:1; `mute` is the floor.
- Touch targets are at least 40 px on `pointer: coarse`.
- Shortcut hints match the platform: `⌘K` and `⌘F` on macOS, `Ctrl` elsewhere.

## Do and don't

**Do** use shared components, show a sample by default, wrap toolbars, and label every control.

**Don't** add a light theme, a second accent, card drop shadows, new font families, new type sizes, or animation on frequent actions.

## Not yet in code

Remove each row once the code matches.

| # | Gap | Where |
| --- | --- | --- |
| 1 | Some buttons are still styled by hand, so heights vary around the 28 px mouse size | Tool-specific toggles, `TreeSearchBar`, `ErrorBanner`, `RepairModal` |
| 2 | Editing a tree value needs a double-click; there is no keyboard way | `TreeView` |
| 3 | URL passwords are shown and saved in plain text | URL Parser |
