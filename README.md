# Snake Game - Electron Desktop App

A classic Snake game built as a cross-platform desktop application using **Electron**, **React**, **TypeScript**, and the **Canvas API**.

## What is Electron?

[Electron](https://www.electronjs.org/) is an open-source framework that lets you build desktop applications using web technologies — HTML, CSS, and JavaScript. It combines the **Chromium** rendering engine with **Node.js**, so your app runs in a full-featured browser environment with access to the file system, OS-level APIs, and native window management.

This project uses Electron's **three-process architecture**:

- **Main process** (`src/main/`) — creates the browser window and manages app lifecycle
- **Preload script** (`src/preload/`) — safely bridges main and renderer via `contextBridge`
- **Renderer process** (`src/renderer/`) — renders the React UI and runs the game loop

## Features

- **Canvas-rendered game** — 20×20 grid, smooth arcade-style visuals
- **Keyboard controls** — Arrow keys to steer, with a 2-input input buffer
- **Collision detection** — wall collision and self-collision end the game
- **Live scoring** — each food pellet adds 1 point; best visible on the score bar
- **i18n support** — toggle between Chinese and English at any time
- **Game history** — last 10 records saved to `localStorage`; view and clear via modal
- **Zero external runtime dependencies** for game logic — pure TypeScript, no game engine

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop shell | Electron 39 |
| UI framework | React 19 |
| Language | TypeScript 5.9 |
| Bundler | electron-vite (Vite 7) |
| Game rendering | Canvas 2D API |
| Testing | Vitest + jsdom |
| Packaging | electron-builder |

## Project Structure

```
src/
├── main/index.ts              # Electron main process
├── preload/index.ts           # Context bridge
└── renderer/src/
    ├── App.tsx                # Root component, state machine
    ├── main.tsx               # React entry point
    ├── components/
    │   ├── GameCanvas.tsx     # Canvas + game loop controller
    │   └── HistoryModal.tsx   # History records popup
    ├── game/
    │   ├── types.ts           # Direction, Position, Snake, etc.
    │   ├── snake.ts           # Snake movement, collision, input queue
    │   ├── food.ts            # Food generation (avoids snake body)
    │   ├── renderer.ts        # Canvas drawing functions
    │   └── gameLoop.ts        # Tick loop at 150ms interval
    ├── i18n/
    │   ├── context.tsx        # I18nProvider + useI18n hook
    │   ├── zh.json            # Chinese translations
    │   └── en.json            # English translations
    └── utils/
        └── history.ts         # localStorage read/write/clear
```

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens the Electron window with hot-reload enabled.

### Testing

```bash
npm test
```

Runs 18 unit tests covering snake logic, food generation, and history utilities via Vitest.

### Build

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Packages the app into an installer via electron-builder.

## How to Play

| Action | Key |
|--------|-----|
| Move up | ↑ |
| Move down | ↓ |
| Move left | ← |
| Move right | → |
| Start / Restart | Space |
| Toggle language | Button in top bar |
| View history | Button in top bar |

- The snake starts at the center of a 20×20 grid.
- Eat red food pellets to grow and increase your score.
- Hitting a wall or your own tail ends the game.
- Hold up to 2 direction inputs in the buffer for responsive controls.

## License

MIT
