# Electron + React + SQLite Starter Template

A reusable desktop-application scaffold. Use this to bootstrap new Electron desktop apps quickly.

## Tech Stack

- **Electron 27** (main process + preload bridge)
- **React 18** + **React Router 6** (HashRouter) renderer, built with **Vite**
- **Tailwind CSS** for styling
- **sql.js** (SQLite compiled to WASM) for local storage, wrapped in a synchronous `better-sqlite3`-style compatibility layer (`database/compat.js`)
- **axios** for external HTTP APIs

## Architecture

```
Renderer (React)  --ipcRenderer.invoke / .on-->  Preload (contextBridge)  -->  Main (Node)
                                                                               ├─ services/
                                                                               ├─ database/
                                                                               ├─ api/
                                                                               └─ sync/ (core engine)
```

- `nodeIntegration: false`, `contextIsolation: true`. The renderer only talks to the main process through the curated `window.electronAPI` object.
- Long-running work lives in `sync/engine.js` and emits `app:progress` events that are streamed to the UI.

## Project Structure

```
electron-react-starter/
├── electron/
│   └── main/
│       ├── main.js              # app lifecycle, window, event wiring
│       ├── preload.js           # contextBridge API exposed to renderer
│       ├── ipc/
│       │   └── index.js         # all IPC handlers
│       └── services/
│           ├── SettingsService.js
│           ├── LoggerService.js
│           ├── ErrorHandler.js
│           └── WindowManager.js
├── database/
│   ├── database.js              # DatabaseService (sql.js)
│   ├── compat.js                # better-sqlite3-style wrapper
│   └── schema.sql               # SQLite schema
├── api/
│   └── client.js                # generic axios API client
├── sync/
│   └── engine.js                # core task/background engine
├── storage/
│   └── settings.json            # placeholder (settings live in userData via electron-settings)
├── src/
│   ├── api/electronAPI.js       # safe preload accessor
│   ├── components/              # Navbar, StatusBadge, ProgressBar
│   ├── hooks/                   # useTask, useSettings
│   ├── pages/                   # HomePage, SettingsPage
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .gitignore
└── package.json
```

## Getting Started

### Prerequisites

Node.js 18+ and npm.

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

## How to Customize

1. **Database**: edit `database/schema.sql` and add query methods to `database/database.js`. Expose them via new IPC channels in `electron/main/ipc/index.js` + `electron/main/preload.js`.
2. **API**: point `api/client.js` at your backend (set `baseUrl` from settings).
3. **Core logic**: implement your workflow inside `sync/engine.js` `run()` and emit `app:progress` events to drive the UI progress bar.
4. **UI**: add pages under `src/pages/`, register routes in `src/App.jsx`, and expose any new IPC channels in `preload.js` + `electron/main/ipc/index.js`.
5. **Settings**: extend defaults in `electron/main/services/SettingsService.js` and the form in `src/pages/SettingsPage.jsx`.

## IPC Bridge

The renderer accesses Electron through `src/api/electronAPI.js`, which wraps `window.electronAPI` (exposed by `electron/main/preload.js`) with a no-op stub for non-Electron environments.

Available channels:

- `app:getVersion`, `app:getPath`
- `settings:get`, `settings:update`, `settings:reset`
- `task:run`, `task:cancel`, `task:status`
- `db:query`, `db:getAll`
- `fs:readDirectory`, `fs:fileExists`
- `dialog:openFile`, `dialog:openDirectory`, `dialog:saveFile`, `dialog:showMessage`
- `util:openExternal`
- `app:progress` (renderer listener, main -> renderer event stream)

## Packaging

```bash
npm run dist
```

Output goes to `/release`. Platform targets:

- Windows: NSIS installer
- macOS: DMG
- Linux: AppImage

Configure `package.json` > `build` (electron-builder) to change app ID, product name, or targets.

## Security

- `contextIsolation: true`, `nodeIntegration: false`
- Preload exposes only a curated `electronAPI` surface via `contextBridge`
- Navigation is disabled (`will-navigate` prevented)

> Note: `node_modules/`, `dist/`, `release/`, `logs/`, `*.db`, and `storage/` are git-ignored.
