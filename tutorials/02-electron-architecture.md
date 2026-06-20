# 02 — Electron Architecture: Main, Preload, and Renderer

## Overview

This tutorial takes a deep dive into the three-process architecture that every Electron app uses. You'll learn how the **main process**, **preload script**, and **renderer process** work together by examining the actual code in this Snake game project.

By the end of this tutorial, you'll understand:

- How the main process creates and manages the game window
- How the preload script exposes APIs safely
- How the renderer process loads and runs the React game UI
- The security model that protects users
- How IPC (Inter-Process Communication) works

---

## Prerequisites

- Completed **[01-intro-electron.md](01-intro-electron.md)** — you understand the two-runtime concept
- Basic familiarity with **Node.js event handling** (`on`, `send`, `listeners`)
- JavaScript **async/callback patterns** (Promises are used in Electron IPC)

---

## The Full Architecture in This Project

Let's start by tracing what happens from the moment a user launches the Snake game:

```
User double-clicks electron-snake-game.exe
                      │
                      ▼
          1. Electron loads main process
             ├── src/main/index.ts
             ├── Creates a BrowserWindow
             ├── Sets up IPC listeners
             └── Loads the renderer HTML
                      │
                      ▼
          2. Electron loads preload script
             ├── src/preload/index.ts
             ├── Runs before the web page loads
             └── Exposes API via contextBridge
                      │
                      ▼
          3. Renderer process starts
             ├── src/renderer/index.html
             ├── React boots (main.tsx)
             └── App.tsx renders the game UI
                      │
                      ▼
          4. User plays the snake game
             ├── Canvas renders game graphics
             ├── Arrow keys control the snake
             └── (IPC not needed — everything is in-process)
```

Notice step 4: this Snake game is **self-contained in the renderer**. The game logic, Canvas rendering, localStorage, and i18n all live in the renderer process. The main process only handles window creation. This is a common pattern for simpler apps — you only need IPC when the renderer needs something only the main process can do (file system, native dialogs, system tray, etc.).

---

## 1. The Main Process (`src/main/index.ts`)

The main process is the **entry point** of every Electron application. It runs in a Node.js environment and has full access to the operating system.

Let's examine `src/main/index.ts` line by line.

### Imports

```typescript
// src/main/index.ts:1-4
import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
```

| Import | Purpose |
|--------|---------|
| `app` | Controls the application's lifecycle (start, quit, events) |
| `shell` | Opens URLs in the system's default browser |
| `BrowserWindow` | Creates and manages a window |
| `ipcMain` | Listens for messages from the renderer process |
| `join` (from `path`) | Safely constructs file paths cross-platform |
| `electronApp` | Toolkit helper for app setup |
| `optimizer` | Toolkit helper for window shortcuts |
| `is` | Toolkit helper to detect dev/production mode |

### The `createWindow` Function

```typescript
// src/main/index.ts:6-36
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
```

**`BrowserWindow`** is the class that creates a native OS window. Let's break down the options:

| Option | Value | Purpose |
|--------|-------|---------|
| `width`, `height` | 900, 670 | The initial window size in pixels |
| `show: false` | Creates the window hidden | Prevents a white flash before the page is ready |
| `autoHideMenuBar` | `true` | Hides the menu bar (File, Edit, etc.) automatically |
| `preload` | Path to preload script | Tells Electron to run this script before loading the web page |
| `sandbox` | `false` | (See security section below) |

The `show: false` + `ready-to-show` pattern is important:

```typescript
// src/main/index.ts:20-22
mainWindow.on('ready-to-show', () => {
  mainWindow.show()
})
```

This waits until the renderer has finished loading, then shows the window. Without this, users would see a blank white window for a split second.

### Loading the Renderer

```typescript
// src/main/index.ts:30-35
if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
  mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
} else {
  mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}
```

- **Dev mode**: loads from the Vite dev server (e.g., `http://localhost:5173`), enabling hot reload
- **Production mode**: loads the compiled HTML file from disk

### App Lifecycle Events

```typescript
// src/main/index.ts:41-71
app.whenReady().then(() => {
  // 1. Set app user model ID (Windows taskbar identity)
  electronApp.setAppUserModelId('com.electron')

  // 2. Watch window shortcuts (F12 for devtools, Cmd+R reload)
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 3. IPC test handler (example)
  ipcMain.on('ping', () => console.log('pong'))

  // 4. Create the window
  createWindow()

  // 5. macOS: re-create window on dock click
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 6. Quit on all windows closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
```

Key lifecycle events:

| Event | When it fires | Purpose |
|-------|---------------|---------|
| `app.whenReady()` | After Electron has initialized | Safe to create windows here |
| `browser-window-created` | When any window is created | Set up window-level behaviors |
| `window-all-closed` | When all windows are closed | Quit app (on Windows/Linux) |
| `activate` | macOS dock icon click | Re-create window if none exists |

#### macOS Note

On macOS, apps typically stay running even when all windows are closed (like Safari). The `activate` handler re-creates the window when the user clicks the dock icon. This is why the quit logic differs:

```typescript
// macOS: keep running even without windows
if (process.platform !== 'darwin') {
  app.quit()
}
// Windows/Linux: quit when all windows close
```

---

## 2. The Preload Script (`src/preload/index.ts`)

The preload script is the **security bridge** between the main and renderer processes. It runs in the renderer process **before** any web page content loads, and it has access to a limited set of Node.js APIs.

### Why NOT Just Use `require` in the Renderer?

In older Electron versions, you could write `require('electron')` directly in the renderer. This was convenient but **dangerous** — it meant any code running in the renderer (including third-party scripts) had full access to Node.js and the user's system.

Modern Electron apps enable **context isolation** (`contextIsolation: true` by default), which means:

1. The renderer runs in a separate JavaScript context
2. It cannot access Node.js APIs directly
3. It cannot `require` modules
4. It can only use what the preload script explicitly exposes

### The Script

```typescript
// src/preload/index.ts:1-22
import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
```

### How `contextBridge` Works

`contextBridge.exposeInMainWorld(key, value)` does two things:

1. Creates a property on `window[key]` in the renderer
2. Creates a **safe, structured clone** of the value — the renderer cannot modify the original object

So `window.electron` in the renderer gets a copy of `electronAPI` (which contains things like `ipcRenderer`). The renderer can call methods on it but cannot tamper with the actual Electron internals.

### What Does `electronAPI` Contain?

From `@electron-toolkit/preload`, `electronAPI` provides:

```typescript
interface ElectronAPI {
  ipcRenderer: {
    send(channel: string, ...args: any[]): void
    on(channel: string, callback: Function): void
    invoke(channel: string, ...args: any[]): Promise<any>
    // ... and more
  }
  process: {
    versions: {
      electron: string
      chrome: string
      node: string
    }
  }
}
```

The renderer uses `window.electron.ipcRenderer.send('ping')` in the template `App.tsx` to communicate with the main process. In our Snake game, we don't actually send any IPC messages — but the infrastructure is there.

### Type Definitions

The file `src/preload/index.d.ts` tells TypeScript what the exposed APIs look like:

```typescript
// src/preload/index.d.ts:1-8
import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
  }
}
```

This is a **global type augmentation** — it tells TypeScript that `window.electron` exists and has the `ElectronAPI` type. Without this, TypeScript would throw an error when you write `window.electron.ipcRenderer.send(...)`.

---

## 3. The Renderer Process (`src/renderer/`)

The renderer process is where the **game UI** lives. It's essentially a web page with special privileges.

### Entry Point

`src/renderer/index.html` is the HTML page loaded by `mainWindow.loadFile()` or `mainWindow.loadURL()`:

```html
<!-- src/renderer/index.html:1-16 -->
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Electron</title>
    <!-- Content Security Policy (CSP) -->
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Content Security Policy (CSP)

The `<meta http-equiv="Content-Security-Policy">` tag is a **security feature** that tells the browser what resources are allowed to load. This CSP says:

| Directive | Value | Meaning |
|-----------|-------|---------|
| `default-src` | `'self'` | Only load resources from the app's own origin |
| `script-src` | `'self'` | Only run scripts from the app's own origin |
| `style-src` | `'self' 'unsafe-inline'` | Allow inline styles (React uses inline styles) |
| `img-src` | `'self' data:` | Allow images from the app and inline `data:` URIs |

CSP prevents XSS (Cross-Site Scripting) attacks. If an attacker somehow injects a `<script>` tag pointing to their server, the browser blocks it.

### The React App

`src/renderer/src/main.tsx` boots React:

```typescript
// src/renderer/src/main.tsx:1-11
import './assets/main.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

This is standard React 19 — `createRoot` from `react-dom/client` mounts the `<App />` component into the `#root` div.

---

## 4. Security: Sandbox and Context Isolation

Electron has evolved its security model significantly. Two key concepts:

### Context Isolation

**Enabled by default** in modern Electron. The renderer's JavaScript context is completely separate from the preload's context. The renderer:
- Cannot access Node.js APIs directly
- Cannot `require()` modules
- Can only use what `contextBridge` exposes

### Sandbox

**Disabled in this project** (`sandbox: false`). When sandbox is enabled:
- The renderer is even more restricted
- The preload script also runs in a sandboxed environment
- Some Node.js APIs become unavailable

This project sets `sandbox: false` because it's a simple game that doesn't need the extra security restrictions. For a production app handling sensitive data, you'd typically enable sandbox and carefully design what the preload exposes.

### The Security Principle

```
Least Privilege — each part of the app should have only the permissions it needs.

Main process:    full system access (files, processes, OS) — OK, it's the backend
Preload script:  limited Node.js — only what's needed to bridge
Renderer:        NO Node.js — it only renders UI and calls exposed APIs
```

This is why this Snake game doesn't need IPC: the game logic, localStorage, and Canvas rendering all run in the renderer and don't require elevated privileges.

---

## 5. IPC: The Communication Channel

Even though this Snake game doesn't use IPC, it's essential to understand how it works because most Electron apps will need it.

### IPC Pattern

```
Renderer (web page)                  Main Process
       │                                  │
       │  ipcRenderer.send('channel')     │
       ├─────────────────────────────────►│
       │                                  │  ipcMain.on('channel', handler)
       │                                  │
       │  ipcRenderer.on('reply', data)   │
       │◄─────────────────────────────────┤  event.reply('reply', data)
       │                                  │
```

### Two IPC Modes

| Mode | Method | Use Case |
|------|--------|----------|
| **One-way** | `send` / `on` | Fire-and-forget messages (e.g., log something) |
| **Request-Response** | `invoke` / `handle` | Ask main process for something and wait for a result (e.g., read a file) |

### Example (if the game used IPC)

If the Snake game needed to save scores to a file instead of localStorage:

```typescript
// Preload: expose a saveScore function
contextBridge.exposeInMainWorld('api', {
  saveScore: (score: number) => ipcRenderer.invoke('save-score', score)
})

// Main: handle the request
ipcMain.handle('save-score', async (event, score: number) => {
  await fs.writeFile('scores.json', JSON.stringify(score))
  return 'saved'
})

// Renderer: call it
await window.api.saveScore(10)
```

---

## Key Takeaways

1. **Main process** (`src/main/index.ts`) creates the window, manages lifecycle, and acts as the app's backend
2. **Preload script** (`src/preload/index.ts`) uses `contextBridge` to safely expose APIs to the renderer
3. **Renderer process** (`src/renderer/`) renders the UI and runs the game — it's a web page with special privileges
4. **`BrowserWindow`** options control window size, security, and behavior
5. **CSP** prevents XSS attacks by restricting what resources can load
6. **Context isolation** keeps the renderer separate from Node.js, enhancing security
7. **IPC** is the communication channel between processes, though this game doesn't need it

---

## What's Next

Now that you understand Electron's architecture, the next tutorial covers **[03-typescript-basics.md](03-typescript-basics.md)** — how TypeScript types, interfaces, and enums are used throughout this project to make the game code safer and more readable.
