# 03 — TypeScript Basics in the Game Project

## Overview

This project is written entirely in **TypeScript** — a typed superset of JavaScript that catches errors at compile time rather than runtime. In this tutorial, you'll learn how TypeScript is used throughout the Snake game by examining the type definitions, interfaces, and enums that make the code safer and more self-documenting.

By the end of this tutorial, you'll understand:

- The difference between TypeScript and JavaScript
- How `type`, `interface`, and `enum` are used in the project
- The game's core type definitions and why they matter
- How TypeScript integrates with React components
- How ambient type declarations work for Electron

---

## Prerequisites

- **JavaScript basics** — variables, functions, objects, arrays
- **Object-oriented concepts** — what a class/interface is (helpful but not required)
- Completion of **[01-intro-electron.md](01-intro-electron.md)** and **[02-electron-architecture.md](02-electron-architecture.md)** is helpful for context

---

## What is TypeScript?

TypeScript is **JavaScript with static types**. Consider this plain JavaScript:

```javascript
// JavaScript — no type checking
function add(a, b) {
  return a + b
}

add(5, 10)       // 15 — works
add("5", 10)     // "510" — oops, string concatenation instead of addition
```

The same function in TypeScript:

```typescript
// TypeScript — type checking catches the error
function add(a: number, b: number): number {
  return a + b
}

add(5, 10)       // 15 ✓
add("5", 10)     // Error: Argument of type 'string' is not assignable to parameter of type 'number'
```

TypeScript catches this at **compile time** (when you run `tsc` or `npm run typecheck`) rather than at runtime when the user encounters it as a bug.

### How TypeScript Works in This Project

```
You write:            .ts / .tsx files (TypeScript)
       │
electron-vite builds  │  (also runs tsc for type checking)
       │
       ▼
Output:               .js / .jsx files (plain JavaScript, run by Electron)
```

The TypeScript compiler removes all type annotations and produces clean JavaScript that runs anywhere JavaScript runs. TypeScript is a **development-time tool only** — the runtime never sees types.

---

## TypeScript Configuration

### tsconfig Files

This project has **three** TypeScript configuration files:

| File | Purpose |
|------|---------|
| `tsconfig.json` | Root config that references the other two |
| `tsconfig.node.json` | Config for main process and preload (Node.js environment) |
| `tsconfig.web.json` | Config for renderer (browser environment with React JSX) |

`tsconfig.web.json` (`src/../tsconfig.web.json:1-19`):

```json
{
  "extends": "@electron-toolkit/tsconfig/tsconfig.web.json",
  "include": [
    "src/renderer/src/env.d.ts",
    "src/renderer/src/**/*",
    "src/renderer/src/**/*.tsx",
    "src/preload/*.d.ts"
  ],
  "compilerOptions": {
    "composite": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@renderer/*": ["src/renderer/src/*"]
    }
  }
}
```

Key points:

- **`jsx: "react-jsx"`** — enables JSX syntax for React components
- **`paths`** — creates the `@renderer/` import alias (e.g., `import { X } from '@renderer/components/X'`)
- **`include`** — tells TypeScript which files to type-check

---

## Core Game Types (`src/renderer/src/game/types.ts`)

The file `src/renderer/src/game/types.ts` defines every type used in the game logic. Let's examine each one.

### Enums

```typescript
// src/renderer/src/game/types.ts:1-6
export enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT'
}
```

**`enum`** (enumeration) is a TypeScript feature that creates a set of named constants. Without an enum, you might write:

```javascript
// JavaScript — magic strings, error-prone
const direction = 'up'

if (direction === 'Up')    // typo! won't catch this
if (direction === 'up')    // correct, but not enforced
```

With the enum:

```typescript
// TypeScript — only valid values allowed
const direction: Direction = Direction.Up

if (direction === Direction.Up)    // ✓ correct
if (direction === 'UP')            // works (enum value)
if (direction === 'up')            // ❌ Error: not assignable
```

Enums also provide **auto-completion** in your editor — when you type `Direction.`, your IDE shows all four options.

#### String Enums vs Numeric Enums

This enum uses **string values** (`'UP'`, `'DOWN'`, etc.) rather than the default numeric values (`0`, `1`, `2`, `3`). String enums are more readable when logged or serialized to JSON.

### Interfaces

```typescript
// src/renderer/src/game/types.ts:8-12
export interface Position {
  x: number
  y: number
}
```

**`interface`** defines the shape of an object. A `Position` is any object that has an `x` and `y` property, both numbers. This is used for every coordinate in the game — snake segments, food, grid cells.

Without the interface:

```typescript
// What does this function expect? No idea without reading the body.
function moveSnake(snake, food) { ... }

// With interface — self-documenting:
function moveSnake(snake: Snake, food: Position): { ate: boolean } { ... }
```

### Complex Types

```typescript
// src/renderer/src/game/types.ts:14-20
export interface Snake {
  body: Position[]
  direction: Direction
  queue: Direction[]
  alive: boolean
}
```

| Property | Type | Purpose |
|----------|------|---------|
| `body` | `Position[]` | Array of segments, tail first, head last |
| `direction` | `Direction` | Current movement direction |
| `queue` | `Direction[]` | Buffered direction changes (max 2) |
| `alive` | `boolean` | Whether the snake is still alive |

The `Snake` interface describes everything needed to represent the snake at any moment.

```typescript
// src/renderer/src/game/types.ts:22-27
export interface GameState {
  snake: Snake
  food: Position
  score: number
  startTime: number
}
```

`GameState` aggregates the entire game state into one object — the snake, the food position, the current score, and when the game started.

```typescript
// src/renderer/src/game/types.ts:29-33
export interface HistoryRecord {
  score: number
  date: string
  duration: number
}
```

This represents one saved game result. `duration` is in seconds.

### Constants

```typescript
// src/renderer/src/game/types.ts:35-38
export const GRID_SIZE = 20
export const CELL_SIZE = 25
export const CANVAS_SIZE = GRID_SIZE * CELL_SIZE  // 500
export const TICK_INTERVAL = 150
```

These are **constants** that configure the game world. By defining them in one place:

- `GRID_SIZE` = 20 (the grid is 20×20 cells)
- `CELL_SIZE` = 25 (each cell is 25×25 pixels)
- `CANVAS_SIZE` = 500 (the canvas is 500×500 pixels)
- `TICK_INTERVAL` = 150 (the game updates every 150 milliseconds)

If you wanted to change the grid to 30×30, you only change `GRID_SIZE` and everything adjusts.

---

## Type Aliases vs Interfaces

TypeScript has two ways to define object shapes: `type` and `interface`. This project uses `interface` for objects, but you'll also see `type` in other projects.

```typescript
// interface — can be extended (merged)
interface Position {
  x: number
  y: number
}

// type — can create unions and intersections
type Position = {
  x: number
  y: number
}

// type can do things interface cannot:
type Status = 'idle' | 'playing' | 'gameover'   // union type
type PointOrNull = Position | null               // union with null
```

The rule of thumb: use `interface` for object shapes, use `type` for everything else (unions, intersections, primitives).

---

## TypeScript in React Components

React components use TypeScript to define their **props** and **state**.

### Props Interface

Every component has a `Props` interface:

```typescript
// src/renderer/src/components/GameCanvas.tsx:5-8
interface Props {
  screen: 'idle' | 'playing' | 'gameover'
  onDeath: (score: number) => void
  onScoreChange: (score: number) => void
}
```

This is a **union type** — `screen` can only be one of three string literals. TypeScript will flag any typo immediately.

The `onDeath` and `onScoreChange` are **function types**. They describe the parameters and return type.

### Using Props

```typescript
// destructuring with type annotation
export default function GameCanvas({ screen, onDeath, onScoreChange }: Props) {
```

TypeScript knows that `screen` is one of the three strings, `onDeath` takes a number, etc.

### Type Inference with Hooks

TypeScript can infer types from React hooks automatically:

```typescript
const [screen, setScreen] = useState<'idle' | 'playing' | 'gameover'>('idle')
//           ^  inferred as the union type   ^
```

`useState` is a **generic function**. The type parameter `<'idle' | 'playing' | 'gameover'>` tells TypeScript that `screen` can only be those three values, and `setScreen` only accepts those three values.

### Refs

```typescript
const canvasRef = useRef<HTMLCanvasElement>(null)
//                          ^ type parameter
```

`useRef<HTMLCanvasElement>(null)` creates a ref that holds an `HTMLCanvasElement | null`. TypeScript knows that `canvasRef.current` is either a canvas element or `null`.

---

## Ambient Type Declarations

The file `src/renderer/src/env.d.ts` provides:

```typescript
// src/renderer/src/env.d.ts
/// <reference types="vite/client" />
```

This is a **triple-slash directive** that tells TypeScript to include Vite's client type definitions. It enables features like:

- `import.meta.env` type information
- Asset imports (`.svg`, `.png`) knowing their types

And `src/preload/index.d.ts` augments the global `Window` type:

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

This tells TypeScript that `window.electron` exists. Without it, `window.electron.ipcRenderer.send(...)` would produce a type error.

---

## Why TypeScript for a Game?

You might think a Snake game is simple enough for plain JavaScript. Here's why TypeScript helps:

### 1. Catch Bugs at Compile Time

```typescript
// Snake body should be Position[], but someone passes a string:
snake.body = "hello"    // ❌ TypeScript error immediately
```

### 2. Self-Documenting Code

```typescript
function generateFood(snakeBody: Position[]): Position
```

You know instantly: it takes an array of positions (the snake), returns a single position (the food). No need to read the function body.

### 3. Refactoring Confidence

When you change the `Position` interface (e.g., add a `z` property), TypeScript shows every file that uses `Position`. You won't forget to update anything.

### 4. Editor Intelligence

With TypeScript, your IDE provides:

- Auto-completion for property names
- Inline type hints
- Jump-to-definition
- Refactoring tools (rename, extract)

---

## Key Takeaways

1. **TypeScript = JavaScript + static types** — catches errors before runtime
2. **`enum`** defines a set of named constants (like `Direction`)
3. **`interface`** describes object shapes (like `Position`, `Snake`, `GameState`)
4. **`type`** can create unions (`'a' | 'b'`) and intersections
5. **Props interfaces** make React component APIs explicit and safe
6. **Generic types** like `useState<T>` let TypeScript understand hook values
7. **Ambient declarations** (`.d.ts` files) tell TypeScript about global APIs
8. TypeScript provides **editor intelligence** and **compile-time error checking** without any runtime cost

---

## What's Next

With TypeScript types understood, go to **[04-react-hooks-and-state.md](04-react-hooks-and-state.md)** to learn how the Snake game uses React hooks and the state machine pattern to manage the game lifecycle.
