# Jade — AI Desktop Assistant

A cyberpunk-styled, local-first AI desktop assistant that connects to Ollama models, manages your Obsidian vault, and provides retrieval-augmented generation over your personal notes.

## Design System

Jade uses a **cyberpunk design language**: an almost-black canvas (`#080A0F`) with controlled neon accents, condensed Rajdhani display type, JetBrains Mono technical text, angular surfaces, and dense information layouts. Neon color communicates meaning, not decoration.

| Token | Value | Use |
|---|---|---|
| Background | `#080A0F` | Page background |
| Surface-1 | `#0E1119` | Sidebar and recessed areas |
| Surface-2 | `#141925` | Cards and panels |
| Surface-3 | `#1B2230` | Hover surfaces and tracks |
| Line | `#293244` | Borders, rules, chart grids |
| Text | `#F2F5F7` | Primary text |
| Cyan | `#00E5FF` | Information and links |
| Yellow | `#FCEE09` | Primary action and selection |
| Green | `#5DFF6A` | Healthy and successful states |
| Magenta | `#C44DFF` | Advanced or system content |
| Pink | `#FF3B7A` | Warning, negative, or destructive states |
| Orange | `#FF9F43` | Secondary comparison data |

## Tech Stack

- **Electron** (main process + preload bridge)
- **React 18** + **React Router** (HashRouter) renderer, built with **Vite**
- **Tailwind CSS** with custom cyberpunk design tokens
- **better-sqlite3** (SQLite, WAL mode) for local storage
- **Ollama** (`/api/chat` streaming, `/api/embed` embeddings) for local LLM
- **pdf-parse** and **mammoth** for document importing (.txt, .md, .pdf, .docx)

## Architecture

```
Renderer (React)  --ipcRenderer.invoke / .on-->  Preload (contextBridge)  -->  Main (Node)
                                                                                ├─ services/
                                                                                ├─ ipc/
                                                                                └─ api/
```

- `contextIsolation: true`, `nodeIntegration: false`. The renderer only talks to the main process through the curated `window.api` object.
- Every event subscription returns an unsubscribe function so listeners do not accumulate.

## Project Structure

```
jade/
├── electron/
│   └── main/
│       ├── main.js              # app lifecycle, window, hotkeys, tray, warm-up
│       ├── preload.js           # contextBridge API exposed to renderer
│       ├── ipc/
│       │   ├── index.js         # all IPC handler registration
│       │   ├── chat.js          # Ollama chat streaming
│       │   ├── conversation.js  # SQLite conversation CRUD
│       │   ├── modes.js         # AI mode management
│       │   ├── context.js       # Personal context + RAG + vault + notes
│       │   ├── files.js         # File import + chunking
│       │   ├── document.js      # Map-reduce + batch + watch
│       │   ├── rag.js           # RAG indexing + retrieval
│       │   └── phase8.js        # Hotkeys, tray, startup, backup, lock
│       ├── services/
│       │   ├── db.js            # SQLite database layer
│       │   ├── ollama.js        # Ollama HTTP client
│       │   ├── modes.js         # Mode CRUD, version history, feedback
│       │   ├── context.js       # About-me + prompt assembly
│       │   ├── notes.js         # Markdown note saving with frontmatter
│       │   ├── commands.js      # Slash command parsing
│       │   ├── importer.js      # Document parsing (.txt/.md/.pdf/.docx)
│       │   ├── chunker.js       # Text chunking + date detection
│       │   ├── mapReduce.js     # Map-reduce document processing
│       │   ├── QuickWindowService.js   # Ctrl+Shift+Space quick window
│       │   ├── TrayService.js   # System tray
│       │   ├── StartupService.js # Start with Windows
│       │   ├── OllamaWarmupService.js # Ollama keep-alive warm-up
│       │   ├── BackupService.js  # ZIP export/import
│       │   └── AppLockService.js # scrypt password hashing
│       └── resources/modes/     # Default mode JSON files
├── src/
│   ├── api/chatAPI.js           # Typed preload bridge wrappers
│   ├── store/conversationStore.js  # Zustand state
│   ├── components/
│   │   ├── chat/                # ChatView, MessageList, MessageBubble, etc.
│   │   ├── files/               # AttachmentChip, AttachFileDialog, ProcessingProgress
│   │   ├── layout/Sidebar.jsx   # Conversation sidebar
│   │   ├── modes/               # ModePicker, ModeEditor, ModeTestPanel
│   │   ├── Navbar.jsx           # Top navigation
│   │   ├── StatusBadge.jsx
│   │   └── ProgressBar.jsx
│   ├── pages/
│   │   ├── HomePage.jsx
│   │   ├── ChatPage.jsx
│   │   └── SettingsPage.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css                # Cyberpunk base styles + fonts
├── resources/modes/             # 12 default mode JSON files
├── index.html
├── vite.config.js
├── tailwind.config.js           # Cyberpunk design tokens
├── postcss.config.js
├── .gitignore
└── package.json
```

## Getting Started

### Prerequisites

Node.js 18+ and npm. You also need [Ollama](https://ollama.com) installed and running locally.

### Install

```bash
npm install
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Run the packaged Electron app |
| `npm run dev` | Vite dev server (5173) + Electron concurrently |
| `npm run dev:react` | Vite dev server only |
| `npm run dev:electron` | Electron, waits for Vite to be ready |
| `npm run build` | Vite build + electron-builder |
| `npm run build:react` | Vite production build into `/dist` |
| `npm run build:electron` | Package with electron-builder into `/release` |
| `npm run dist` | Alias for `npm run build` |
| `npm run lint` | ESLint over `.js`, `.jsx`, `.ts`, `.tsx` |

### Development

```bash
npm run dev
```

This starts Vite on `http://localhost:5173`, then launches Electron once the dev server is ready.

## Features

### Chat
- Stream responses from Ollama with per-token delivery
- Stop/cancel in-flight generations via `AbortController`
- Markdown rendering for assistant messages
- Enter to send, Shift+Enter for new line
- Copy, regenerate, edit, and save-to-vault actions on messages
- Feedback (thumbs-up) saves examples to the active mode

### AI Modes
- 12 built-in modes: journal-digest, knowledge-note, concept-explainer, brainstorm, code-helper, message-drafter, how-to, comparison, summary, project-plan, flashcards, study-questions
- Mode picker in header and slash commands (e.g. `/journal`, `/note`, `/code`)
- Custom mode editor with system prompt, template, rules, examples, model, temperature
- Version history with compare and restore
- Auto-titles new conversations after first response (5 words max, falls back to first 40 chars)

### Personal Context
- `about-me.md` stored in user data directory
- Editor in Settings with word counter (~250 words recommended)
- Prepended to every mode prompt so the assistant understands your context
- `/remember <fact>` to append confirmed facts

### Vault & RAG
- Configure Obsidian vault path via directory picker
- Incremental vault indexing with embedding storage in SQLite
- `nomic-embed-text` embeddings with `search_document:` / `search_query:` prefixes
- Cosine similarity retrieval (top 6 chunks)
- RAG prompt: personal context → mode instructions → template → rules → examples → retrieved notes → question
- "Use My Vault" toggle in chat header
- Source navigation with `obsidian://open` links

### Files & Documents
- Drag-and-drop file import (.txt, .md, .pdf, .docx)
- Text chunking by paragraph/sentence boundaries (~1,500 words)
- Journal date heading detection (`# YYYY-MM-DD`)
- Map-reduce processing for documents over ~5,000 estimated tokens
- Batch folder processing (sequential, deduplicated by content hash)
- Optional folder watching with chokidar (approval before processing)

### Productivity Extras
- Global hotkey: `Ctrl+Shift+Space` toggles always-on-top quick window
- System tray with Open/Hide/Quit
- Start with Windows toggle
- Ollama warm-up on launch (`/api/embed` keep-alive)
- ZIP backup and restore of database, modes, about-me, settings
- Optional application lock (scrypt password hashing)

### Obsidian Integration
- Save generated notes to vault with YAML frontmatter
- Auto-extract note titles from first `# ` heading
- Unique filenames (`Note.md`, `Note 2.md`, …)
- Link to existing notes (`[[Title]]`)
- Open notes in Obsidian via `obsidian://open`

## Packaging

```bash
npm run dist
```

Output goes to `/release`. `better-sqlite3` is unpacked from ASAR where required. Ollama is **not** bundled — the app detects when it is not running and shows a clear message with an install link.

Platform targets:
- Windows: NSIS installer
- macOS: DMG
- Linux: AppImage

## Security

- `contextIsolation: true`, `nodeIntegration: false`
- Preload exposes only a curated `window.api` surface via `contextBridge`
- No secrets or keys are stored or logged

> Note: `node_modules/`, `dist/`, `release/`, `*.db`, and `storage/` are git-ignored.
