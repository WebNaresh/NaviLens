# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NaviLens is a privacy-focused Chrome Extension (Manifest V3) for capturing, cropping, annotating, and exporting full-page screenshots. Built with React 19 + TypeScript + Vite. All processing is local — no data sent to external servers.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start Vite dev server (hot reload for popup/capture pages)
bun run build        # Type-check (tsc --noEmit) + production build to dist/
bun run build:zip    # Build + zip dist/ into extension.zip for Chrome Store
bun run lint         # ESLint (flat config)
```

To test changes: load the `dist/` folder as an unpacked extension in `chrome://extensions` (Developer Mode).

## Architecture

The extension has four execution contexts that communicate via `chrome.runtime.sendMessage`:

```
Popup (App.tsx)  ──msg──►  Background Service Worker  ──msg──►  Content Script
                              (src/background/)                  (src/content/)
                                    │
                                    └──opens──►  Capture Result Page
                                                 (src/capture/)
```

### Entry Points (defined in `vite.config.ts`)

| Entry        | Source                    | Purpose                                              |
|-------------|---------------------------|------------------------------------------------------|
| `popup`     | `index.html` / `App.tsx`  | Extension popup — single "Capture Full Page" button   |
| `background`| `src/background/index.ts` | Service worker — message routing, tab management, `captureVisibleTab` |
| `content`   | `src/content/index.ts`    | Injected into every page — performs scroll-and-stitch capture, crop overlay, auto-paste to AI services |
| `capture`   | `capture.html` / `src/capture/index.tsx` | Full-page editor — draw, crop, undo/redo, export PNG/PDF, share to Gemini/ChatGPT |

### Message Flow

User action (keyboard shortcut or popup click) → Background receives command → sends message to Content Script → Content Script captures/crops → stores result in `chrome.storage.local` → Background opens capture result page → Capture page reads from storage and renders editor.

### Key Chrome Storage Keys

- `navilens_current_capture` — captured image dataURL + timestamp
- `navilens_target_pdf` — PDF blob/URL for the PDF viewer
- `navilens_pending_paste` — flag to trigger auto-paste into AI chat tabs

### Content Script Capture Logic (~980 lines)

The content script (`src/content/index.ts`) handles:
- **Full-page capture**: Detects scrollable container (PDF viewer, window, nested), scrolls in steps, captures via background's `captureVisibleTab`, stitches screenshots on a canvas, crops final buffer
- **Viewport capture**: Single `captureVisibleTab` + clipboard write + flash effect
- **Interactive crop**: Crosshair overlay → drag selection → darkened outside area → capture region
- **Auto-paste**: Detects Gemini/ChatGPT/Claude tabs and programmatically pastes captured images

Fixed/sticky elements are hidden during scroll capture to prevent header duplication.

## Tech Stack

- **React 19** + **TypeScript 5.9** + **Vite 7**
- **Tailwind CSS 3** (not v4) with shadcn/ui components
- **html2canvas** for fallback capture
- **jsPDF** + **pdfjs-dist** for PDF export/rendering
- **pdfobject.min.js** served locally from `public/assets/` (Vite rewrites CDN URL)
- Package manager: **Bun**

## shadcn/ui Setup

Config in `components.json`. Components live in `src/components/ui/`. Path alias `@` → `./src`.

## Keyboard Shortcuts (defined in manifest.json)

- `Ctrl+Shift+D` — Capture full page (opens editor)
- `Ctrl+Shift+A` — Capture full page → clipboard
- `Ctrl+Shift+S` — Capture viewport → clipboard
- `Ctrl+Shift+Q` — Interactive crop → clipboard

## License

Custom Source-Available License — educational/study use permitted, commercial use prohibited.
