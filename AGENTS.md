# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Tilda Space AI is a dual-product codebase:

1. **Standalone editor** — React + TypeScript + Vite + Tailwind CSS visual page builder with drag-and-drop blocks, live preview, and HTML/JSON export. Runs at `http://localhost:5173`.
2. **Chrome extension** — Injects a floating AI panel (powered by Gemini) into `tilda.cc` and `tilda.ru` pages, letting users generate HTML blocks from text prompts and paste them into Tilda's editor.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server (standalone editor) | `npm run dev` |
| Lint | `npm run lint` |
| Type check | `npx tsc -b` |
| Build standalone | `npm run build` |
| Build Chrome extension | `npm run build:ext` |

### Extension build

- `npm run build:ext` uses `build.ext.mjs` which invokes `esbuild` to produce three IIFE bundles (`content.js`, `background.js`, `popup.js`) plus copies `manifest.json` and `popup.html` into `dist-ext/`.
- Load the extension in Chrome via `chrome://extensions/` → Developer mode → Load unpacked → select `dist-ext/`.
- The extension targets `tilda.cc` AND `tilda.ru` (both domains are used by Tilda).

### Non-obvious caveats

- **tilda.ru vs tilda.cc**: Russian users are served from `tilda.ru`, not `tilda.cc`. Both domains must be in `manifest.json` content_scripts matches and host_permissions.
- **Gemini model versioning**: Google regularly deprecates older Gemini models. The current model is `gemini-2.5-flash` (set in `src/extension/background/background.ts` and `src/services/geminiService.ts`). If generation returns a 404 "model not found" error, update to the latest model name per [Google's model list](https://ai.google.dev/gemini-api/docs/models).
- **Gemini API key**: Required for AI generation. Set via the extension popup or via the standalone editor's left panel. The key is stored in `chrome.storage.local` (extension) or in-memory (standalone). Add it as a `GEMINI_API_KEY` secret for Cloud Agent sessions.
- **Content script Shadow DOM**: The floating panel renders inside a closed Shadow DOM to avoid CSS conflicts with Tilda's page styles.
- **Vite dev server** binds to `0.0.0.0:5173` (configured in `vite.config.ts`) so it's accessible from remote environments.
- **TypeScript config** includes `"chrome"` in types (`tsconfig.app.json`) for Chrome extension APIs.
