# 11 — Building and Distributing the Electron App

## Overview

This final tutorial covers how the Snake game is **compiled and packaged** into distributable installers using `electron-vite` and `electron-builder`. By the end, you'll understand how to turn the source code into a `.exe` (Windows), `.dmg` (macOS), or `.AppImage` (Linux) that anyone can run without Node.js or npm.

By the end of this tutorial, you'll understand:

- The difference between development and production builds
- How `electron-vite` compiles the three processes
- How `electron-builder` packages everything into installers
- The difference between NSIS (installer) and Portable (standalone) formats
- How the build configuration works

---

## Prerequisites

- **Electron architecture** from [02-electron-architecture.md](02-electron-architecture.md)
- Understanding of **npm scripts** from [01-intro-electron.md](01-intro-electron.md)
- Familiarity with **installers** (what `.exe` installers do)

---

## Development vs Production

Throughout this course, you've been running `npm run dev`. Here's what happens:

### Development

```
npm run dev
  │
  ├── electron-vite compiles main + preload
  ├── electron-vite starts Vite dev server for renderer
  │     └── http://localhost:5173
  ├── Electron launches
  │     └── loads http://localhost:5173
  └── Hot reload: changes appear instantly
```

- Source files are compiled from TypeScript on-the-fly
- The renderer loads from a dev server (network URL)
- DevTools are available (F12)
- No optimization (no minification, no tree-shaking)

### Production

```
npm run build
  │
  ├── tsc type-checking (all three targets)
  ├── electron-vite compiles main → out/main/index.js
  ├── electron-vite compiles preload → out/preload/index.js
  ├── electron-vite compiles renderer → out/renderer/index.html + assets
  │     └── HTML, CSS, JS are minified and bundled
  └── Output: out/ directory with everything needed to run

electron-builder --win
  │
  └── Packages out/ into electron-snake-game-1.0.0-setup.exe
```

- Source files are compiled, minified, and bundled
- The renderer loads from local files (not a server)
- No DevTools
- Everything is optimized for size and speed

---

## The Build Process

### Step 1: TypeScript Type-Checking

```bash
npm run typecheck
```

Runs `tsc --noEmit` on both `tsconfig.node.json` (main + preload) and `tsconfig.web.json` (renderer). This catches type errors without emitting any files.

### Step 2: Compile with electron-vite

```bash
electron-vite build
```

This runs three separate Vite builds:

```
electron-vite build
  │
  ├── main:     src/main/index.ts     → out/main/index.js
  ├── preload:  src/preload/index.ts   → out/preload/index.js
  └── renderer: src/renderer/index.html → out/renderer/index.html
                                           out/renderer/assets/*.js
                                           out/renderer/assets/*.css
```

The output directory `out/` contains everything needed to run the app:

```
out/
├── main/
│   └── index.js          ← compiled main process (Node.js)
├── preload/
│   └── index.js          ← compiled preload script
└── renderer/
    ├── index.html        ← compiled HTML
    └── assets/
        ├── index-xxx.js  ← bundled React + game code
        └── index-xxx.css ← compiled CSS
```

### Step 3: Package with electron-builder

```bash
electron-builder --win
```

Takes the `out/` directory and wraps it with the Electron runtime into a native installer.

---

## electron-builder Configuration (`electron-builder.yml`)

The configuration file controls how the app is packaged.

```yaml
# electron-builder.yml
appId: com.electron.app
productName: electron-snake-game
directories:
  buildResources: build
files:
  - '!**/.vscode/*'
  - '!src/*'
  - '!electron.vite.config.{js,ts,mjs,cjs}'
  - '!{.eslintcache,eslint.config.mjs,.prettierignore,.prettierrc.yaml}'
  - '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}'
asarUnpack:
  - resources/**
```

### Key Fields

| Field | Value | Purpose |
|-------|-------|---------|
| `appId` | `com.electron.app` | Unique identifier for the app (macOS uses this) |
| `productName` | `electron-snake-game` | Display name (shown in installer, start menu) |
| `files` | Glob patterns | Which files to include/exclude in the package |
| `asarUnpack` | `resources/**` | Unpack certain files from the ASAR archive |

### The `files` Pattern

The exclusions (`!src/*`, `!tsconfig*.json`, etc.) ensure that only the compiled output (`out/`) and necessary runtime files are included in the installer. Source files are never distributed.

### ASAR Archives

Electron packages the app's files into an **ASAR archive** (something like a `.tar` for Electron). This:

- Speeds up file access
- Prevents users from easily modifying the app's code
- Keeps the file structure intact

The `asarUnpack` option tells electron-builder to leave certain files outside the archive (like native resources that need direct filesystem access).

### Windows Configuration

```yaml
win:
  target:
    - nsis       # Installer (recommended for users)
    - portable   # Standalone .exe (no install needed)
  executableName: electron-snake-game

nsis:
  artifactName: ${name}-${version}-setup.${ext}
  shortcutName: ${productName}
  uninstallDisplayName: ${productName}
  createDesktopShortcut: always

portable:
  artifactName: ${name}-${version}-portable.${ext}
```

### NSIS Installer

**[NSIS](https://nsis.sourceforge.io/)** (Nullsoft Scriptable Install System) is the Windows installer format. The generated `.exe`:

1. Copies the app files to `Program Files\electron-snake-game`
2. Creates Start Menu shortcuts
3. Creates a Desktop shortcut (optional)
4. Registers an uninstaller in Windows "Add or Remove Programs"

**Best for**: distributing to other people, permanent installation.

### Portable

The **portable** build is a standalone `.exe` that:

1. Contains everything in a single executable
2. No installation required — double-click to run
3. No registry entries, no shortcuts
4. Can run from a USB drive

**Best for**: testing, temporary use, USB drives.

### macOS Configuration

```yaml
mac:
  entitlementsInherit: build/entitlements.mac.plist
  extendInfo:
    - NSCameraUsageDescription: ...
    - NSMicrophoneUsageDescription: ...
  notarize: false
```

On macOS, apps need **entitlements** (permissions) to access system features like the camera, microphone, or documents folder. The `entitlements.mac.plist` file declares these permissions.

**Notarization** (`notarize: false`) is disabled — notarization requires an Apple Developer account and submits the app to Apple for security scanning.

### Linux Configuration

```yaml
linux:
  target:
    - AppImage
    - snap
    - deb
  category: Utility
```

Three Linux formats:

| Format | Extension | What it is |
|--------|-----------|------------|
| AppImage | `.AppImage` | Portable — download, chmod +x, run. Works on any distro |
| snap | `.snap` | Canonical's package format (Ubuntu Store) |
| deb | `.deb` | Debian/Ubuntu package (install with `dpkg`) |

---

## The Build Output

After running `npm run build:win`, the `dist/` directory contains:

```
dist/
├── win-unpacked/                           ← Unpacked app (for testing)
│   ├── electron-snake-game.exe             ← The actual executable
│   ├── resources/
│   │   └── app.asar                        ← Your app bundled
│   └── ...                                 ← Electron runtime files
│
├── electron-snake-game-1.0.0-setup.exe     ← Installer (89 MB)
├── electron-snake-game-1.0.0-setup.exe.blockmap  ← For auto-update
└── electron-snake-game-1.0.0-portable.exe  ← Portable (89 MB)
```

### Why is it 89 MB?

The file size is mostly the **Electron runtime** (Chromium + Node.js), not your app code:

| Component | Size |
|-----------|------|
| Electron runtime (Chromium + Node.js) | ~80 MB |
| Your app code (compiled) | ~1 MB |
| Resources (icons, etc.) | ~1 MB |
| Total | ~82-89 MB |

This is the cost of using Electron. Your app code is a tiny fraction of the total. Minification (removing whitespace, shortening variable names) reduces this further, but the Electron runtime dominates.

### Why `win-unpacked`?

The `win-unpacked` directory is a **byproduct** of the packaging process — it's the app extracted and ready to run, before being bundled into an installer. You can run `dist/win-unpacked/electron-snake-game.exe` directly for testing.

---

## Build Commands Across Platforms

```bash
# Full build (typecheck + compile)
npm run build

# Package for specific platforms
npm run build:win     # Windows (runs build first)
npm run build:mac     # macOS
npm run build:linux   # Linux

# Package without rebuilding (if build is already done)
npx electron-builder --win
npx electron-builder --mac
npx electron-builder --linux

# Package all platforms
npx electron-builder --win --mac --linux
```

---

## Distribution Options

### What to Distribute

| Format | File | Who to give it to |
|--------|------|-------------------|
| **NSIS Installer** | `electron-snake-game-1.0.0-setup.exe` | End users (permanent install) |
| **Portable** | `electron-snake-game-1.0.0-portable.exe` | Quick testers, USB drive users |
| **win-unpacked** | `dist/win-unpacked/` | Developers (run directly, no install) |

### How Users Install

**Setup.exe (recommended):**

1. User double-clicks `electron-snake-game-1.0.0-setup.exe`
2. Installer shows a progress bar, copies files
3. Desktop shortcut appears
4. User double-clicks the shortcut to play
5. Uninstall via Windows Settings → Apps

**Portable.exe:**

1. User downloads `electron-snake-game-1.0.0-portable.exe`
2. User double-clicks it
3. Game starts immediately
4. No uninstall needed — just delete the file

---

## Code Signing

You may notice in the build output:

```
• signing with signtool.exe  path=dist\electron-snake-game-1.0.0-setup.exe
```

**Code signing** digitally signs your executable so Windows knows it comes from a trusted publisher. Without a signature:

- Windows SmartScreen may show "Windows protected your PC" warning
- Antivirus software may flag the unsigned executable

In this project, it attempts to sign but likely fails (no certificate configured). For a real distribution, you'd need a **code signing certificate** from a CA like DigiCert or Sectigo.

---

## Auto-Update (Future Enhancement)

The project has placeholder configuration for auto-updates:

```yaml
publish:
  provider: generic
  url: https://example.com/auto-updates
```

This configures `electron-updater` (from `electron-builder`) to check for updates. When implemented:

1. User installs v1.0.0
2. You publish v1.0.1 to your server
3. User's app automatically downloads and installs the update

This is not currently implemented (no update server), but the configuration is ready if you want to add it later.

---

## Key Takeaways

1. **Build pipeline**: `tsc` type-check → `electron-vite build` (compile) → `electron-builder` (package)
2. **`out/` directory** contains the compiled app (without Electron runtime)
3. **`dist/` directory** contains the packaged installers (with Electron runtime)
4. **NSIS** is the Windows installer format (for permanent installation)
5. **Portable** is a standalone `.exe` (for temporary use, no install)
6. **electron-builder.yml** controls all packaging options (targets, names, icons)
7. **89 MB** is typical for an Electron app — almost all of it is the Chromium runtime
8. For distribution, give users the `-setup.exe` file

---

## Congratulations!

You've completed the tutorial series. You now understand:

- ✅ **Electron architecture** — main process, preload, renderer
- ✅ **TypeScript** — types, interfaces, enums in a real project
- ✅ **React hooks** — state management with state machines
- ✅ **Canvas 2D API** — programmatic game rendering
- ✅ **Game logic** — snake movement, collision detection, food generation
- ✅ **Game loop** — the ticking heart of the game
- ✅ **i18n with Context** — multi-language support
- ✅ **localStorage** — persistent game history
- ✅ **Testing with Vitest** — unit testing pure functions
- ✅ **Build & Distribution** — packaging for end users

The full project source is available at:
**https://github.com/yeweijiehust/electron-snake-game**
