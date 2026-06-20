# 01 — Introduction to Electron

## Overview

This tutorial introduces **Electron**, the framework that powers this Snake game desktop application. You'll learn what Electron is, why it exists, how it works under the hood, and how this project is structured around it.

By the end of this tutorial, you'll understand:

- What makes Electron different from a web app
- The two core technologies Electron combines
- How this project uses Electron to run a Snake game as a native desktop app

---

## Prerequisites

Before reading this, you should be familiar with:

| Concept | What you need to know |
|---------|----------------------|
| **HTML / CSS / JavaScript** | How a web page loads in a browser. If you've written a `.html` file and opened it, you're good. |
| **Node.js basics** | Know what `npm` is, what `package.json` is, and how to run `npm install`. Not required to be deep. |
| **Command line** | Navigating directories, running commands in a terminal. |
| **Desktop vs Web** | Understand that a desktop app (like Chrome or VS Code) runs as its own window on your OS, whereas a web app runs inside a browser tab. |

No prior Electron experience is needed.

---

## What is Electron?

Electron is an **open-source framework** created by GitHub (now maintained by the OpenJS Foundation) that allows you to build cross-platform desktop applications using **web technologies** — HTML, CSS, and JavaScript.

Some famous applications built with Electron:

- **VS Code** (code editor)
- **Slack** (team chat)
- **Discord** (voice/text chat)
- **Figma** (design tool)
- **Notion** (note-taking)
- **Twitch** (streaming client)
- And of course — **this Snake game!**

### The Core Idea

Traditionally, building a desktop app meant learning platform-specific languages:

- Windows → C++ / C# with WinForms or WPF
- macOS → Swift with Cocoa
- Linux → C / Python with GTK or Qt

This meant you had to write separate code for each platform. Electron solves this by letting you write your app once using web technologies, and it runs on **Windows, macOS, and Linux** without changes.

---

## How Electron Works

Electron combines **two major technologies** into a single runtime:

```
┌─────────────────────────────────────┐
│         Electron Application         │
│  ┌───────────────────────────────┐  │
│  │   Chromium (renderer engine)  │  │  ← renders HTML/CSS/JS
│  │   - Full browser engine       │  │
│  │   - Supports modern web APIs  │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │   Node.js (backend runtime)   │  │  ← filesystem, OS APIs
│  │   - File system access        │  │
│  │   - Process management        │  │
│  │   - Native modules            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Chromium

**[Chromium](https://www.chromium.org/)** is the open-source web browser engine that Google Chrome is built on. It handles:

- Parsing and rendering HTML
- Executing JavaScript (via the V8 engine)
- Applying CSS styles
- Managing the DOM (Document Object Model)
- Running Web APIs like `Canvas`, `localStorage`, `fetch`

When you write a web page, you're writing for a browser engine. Electron embeds Chromium directly into your app, so your web code renders exactly as expected — **no browser compatibility worries**.

### Node.js

**[Node.js](https://nodejs.org/)** is a JavaScript runtime that runs outside the browser. It gives you APIs that a web page normally can't access:

- `fs` — read and write files on the filesystem
- `process` — access system information and environment variables
- `child_process` — run other programs
- `path` — work with file paths
- `os` — operating system details

In Electron, Node.js is available alongside Chromium. This means your app can render a UI with web technologies **and** access the filesystem, open native dialogs, show system notifications, and more.

### The Magic Combination

The key insight: in a normal web app running in Chrome, your JavaScript can access the DOM and Web APIs, but **cannot** read files on your computer. In a normal Node.js app, your JavaScript can access the filesystem, but **cannot** render a UI.

Electron gives you **both** in the same runtime. This is what makes it possible to build a full-featured desktop app using nothing but web technologies.

---

## Process Model

One of the most important concepts in Electron is its **multi-process architecture**. Instead of everything running in one place, Electron splits your app into two (or more) processes:

```
┌────────────────────────────────────────────────────┐
│                  Main Process                       │
│              (Node.js, one per app)                  │
│                                                     │
│  • Creates and manages browser windows              │
│  • Controls app lifecycle (start, quit, etc.)       │
│  • Has full Node.js/Native access                   │
│  • Acts as the "backend" of the app                 │
└──────────────┬─────────────────────────────────────┘
               │  IPC (Inter-Process Communication)
               │
┌──────────────▼─────────────────────────────────────┐
│                Renderer Process                     │
│         (Chromium, one per window)                  │
│                                                     │
│  • Renders the HTML/CSS UI                          │
│  • Runs your React/JS code                          │
│  • Has limited Node.js access (for security)        │
│  • Communicates with Main via IPC                   │
└─────────────────────────────────────────────────────┘
```

### Why Two Processes?

This design comes from Chrome itself. Chrome runs each tab in its own process so that if one tab crashes, it doesn't bring down the whole browser. Electron follows the same principle:

1. **Stability** — if the renderer crashes, the main process stays alive and can recover
2. **Security** — the renderer runs with fewer privileges, preventing malicious code from accessing the system
3. **Performance** — multi-core CPUs can handle processes in parallel

### The Preload Script — A Bridge

Between the main and renderer processes, there's a special file called the **preload script**. It runs in the renderer process but has access to a limited set of Node.js APIs via `contextBridge`. This is the secure way to pass data between processes.

```
Renderer (web page)
       │
       │  window.electronAPI.send('ping')
       │
       ▼
Preload Script (bridge)
       │
       │  contextBridge.exposeInMainWorld(...)
       │
       ▼
Main Process (Node.js)
       │
       │  ipcMain.on('ping', ...)
       │
       ▼
   Native action (write file, send notification, etc.)
```

We'll dive deep into this architecture in the next tutorial.

---

## This Project's Electron Setup

Let's look at how this Snake game project configures Electron.

### package.json

In `package.json` (`src/../package.json:2-7`), you'll find:

```json
{
  "name": "electron-snake-game",
  "version": "1.0.0",
  "description": "An Electron application with React and TypeScript",
  "main": "./out/main/index.js"
}
```

The `"main"` field tells Electron where to find the **main process entry point**. When Electron starts, it runs this file first. The file at `./out/main/index.js` is the compiled version of `src/main/index.ts`.

### Dependencies

Looking at `package.json:23-26`:

```json
{
  "@electron-toolkit/preload": "^3.0.2",
  "@electron-toolkit/utils": "^4.0.0"
}
```

These are utility packages from the **electron-toolkit** that provide helper functions for common Electron tasks:

- `@electron-toolkit/preload` — helpers for the preload script (like exposing Electron APIs)
- `@electron-toolkit/utils` — helpers for the main process (like watching shortcuts)

### Dev Dependencies

`package.json:34-37` shows the Electron-specific dev dependencies:

```json
{
  "electron": "^39.2.6",
  "electron-builder": "^26.0.12",
  "electron-vite": "^5.0.0"
}
```

- **`electron`** — the core Electron library (version 39.x). This is the runtime itself.
- **`electron-builder`** — packages your app into installers (.exe, .dmg, .AppImage) for distribution.
- **`electron-vite`** — a build tool that integrates Vite with Electron's main/preload/renderer architecture.

### Scripts

`package.json:8-21` defines the scripts:

```json
{
  "dev": "electron-vite dev",
  "build": "npm run typecheck && electron-vite build",
  "start": "electron-vite preview",
  "build:win": "npm run build && electron-builder --win"
}
```

- `npm run dev` → starts the app in development mode with hot-reload
- `npm run build` → type-checks and compiles all three targets (main, preload, renderer)
- `npm run start` → runs the production build without opening dev tools
- `npm run build:win` → compiles and packages into a Windows installer

### electron.vite.config.ts

The `electron.vite.config.ts` file (`src/../electron.vite.config.ts:1-16`) configures how Vite builds each part of the app:

```typescript
import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},                    // build config for main process
  preload: {},                 // build config for preload script
  renderer: {                  // build config for renderer (React app)
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
```

Each key (`main`, `preload`, `renderer`) is a separate Vite build configuration. This is how `electron-vite` handles the three-process architecture automatically.

---

## Development vs Production

Understanding how Electron runs your code differently in dev vs production is important.

### Development Mode (`npm run dev`)

```
electron-vite dev
       │
       ├── Compiles main process → out/main/index.js
       ├── Compiles preload → out/preload/index.js
       ├── Starts Vite dev server for renderer
       │     (e.g., http://localhost:5173)
       └── Launches Electron, loads the dev server URL
```

- **Hot Module Replacement (HMR)** — changes to React components update instantly without restarting Electron
- **DevTools** — F12 opens Chrome DevTools
- **Source maps** — you can debug TypeScript directly

### Production Mode (`npm run build`)

```
electron-vite build
       │
       ├── Compiles main process → out/main/index.js
       ├── Compiles preload → out/preload/index.js
       ├── Compiles renderer → out/renderer/index.html + assets
       │
electron-builder
       │
       └── Packages everything into an installer
```

- Everything is minified and bundled
- Renderer loads `out/renderer/index.html` from disk (not a dev server)
- No DevTools by default

This is controlled in `src/main/index.ts:30-35`:

```typescript
if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
  mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])  // dev: load from server
} else {
  mainWindow.loadFile(join(__dirname, '../renderer/index.html'))  // prod: load from file
}
```

The `is` object comes from `@electron-toolkit/utils` and detects whether the app is running in dev mode.

---

## Project File Structure

Now let's map the project files to the Electron architecture:

```
electron-snake-game/
│
├── electron-builder.yml      ← electron-builder config for packaging
├── electron.vite.config.ts   ← Vite config for all 3 processes
├── package.json              ← dependencies and scripts
│
├── src/
│   ├── main/
│   │   └── index.ts          ★ Main process entry point
│   │
│   ├── preload/
│   │   ├── index.ts          ★ Preload script (bridge)
│   │   └── index.d.ts        ★ TypeScript declarations for window.api
│   │
│   └── renderer/
│       ├── index.html        ★ The HTML page loaded in the window
│       └── src/
│           ├── main.tsx      ★ React entry point
│           ├── App.tsx       ★ Root React component
│           ├── components/   ★ React UI components
│           ├── game/         ★ Game logic (pure TypeScript)
│           ├── i18n/         ★ Internationalization
│           └── utils/        ★ Utility functions
│
├── resources/                ← App icons and static assets
├── build/                    ← Build configuration assets
│
├── out/                      ← Compiled output (main, preload, renderer)
└── dist/                     ← Packaged installers
```

The **main process** lives in `src/main/index.ts`.  
The **preload script** lives in `src/preload/index.ts`.  
Everything in `src/renderer/` runs in the **renderer process**.

---

## Key Takeaways

1. **Electron** = Chromium (rendering) + Node.js (system access) in one runtime
2. Apps are split into **main process** (backend, one per app) and **renderer process** (UI, one per window)
3. The **preload script** safely bridges the two processes
4. `electron-vite` handles building all three targets (main, preload, renderer)
5. Development uses **HMR** and a dev server; production compiles to static files
6. `electron-builder` packages everything into platform-specific installers

---

## What's Next

Now that you understand what Electron is and how this project is structured, go to **[02-electron-architecture.md](02-electron-architecture.md)** to dive deep into the main process, preload script, and renderer process — the core of every Electron app.
