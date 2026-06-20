# 04 — React Hooks and State Machine

## Overview

This tutorial covers how the Snake game uses **React hooks** (`useState`, `useEffect`, `useCallback`, `useRef`) to manage the game's user interface and lifecycle. You'll learn about the **state machine pattern** that controls whether the game is showing the menu, running, or displaying the game-over screen.

By the end of this tutorial, you'll understand:

- What React hooks are and why they exist
- How the game uses a state machine (`idle` → `playing` → `gameover`)
- How `useEffect` manages side effects (keyboard listeners, game loop)
- How `useCallback` prevents unnecessary re-renders
- How `useRef` preserves mutable values across renders

---

## Prerequisites

- **React basics** — know what a component, props, and JSX are
- **JavaScript closures** — understand how functions capture variables
- Completion of **previous tutorials** for project context (optional)

---

## What Are React Hooks?

Hooks are functions that let React components "hook into" features like state and lifecycle. Before hooks (React < 16.8), state and lifecycle required **class components**:

```typescript
// Class component (old way)
class MyComponent extends React.Component {
  componentDidMount() { /* ... */ }
  render() { return <div /> }
}
```

With hooks, you write **function components**:

```typescript
// Function component with hooks (modern way)
function MyComponent() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    document.title = `Count: ${count}`
  }, [count])

  return <div>{count}</div>
}
```

Hooks make components shorter, reusable, and easier to reason about. The Snake game uses **four** built-in React hooks.

---

## The State Machine Pattern

The game's entire UI flow is controlled by a **state machine** — a model where the app can be in exactly one state at a time, and transitions between states are explicit.

### The Three States

```
                         Space key
     ┌──────────────────────────────────┐
     │                                  │
     ▼                                  │
┌─────────┐   Space key   ┌─────────┐   │
│  idle   │──────────────►│ playing │   │
│         │               │         │   │
│ (menu)  │               │ (game)  │   │
└─────────┘               └────┬────┘   │
                               │        │
                          snake dies    │
                               │        │
                               ▼        │
                          ┌─────────┐   │
                          │gameover │───┘
                          └─────────┘
```

### Type Definition

```typescript
// src/renderer/src/App.tsx:8
type Screen = 'idle' | 'playing' | 'gameover'
```

This is a **TypeScript union type** — `screen` can only be one of these three strings. Any typo or invalid value is caught at compile time.

### useState — The State Hook

```typescript
// src/renderer/src/App.tsx:11-15
const [screen, setScreen] = useState<Screen>('idle')
const [score, setScore] = useState(0)
const [duration, setDuration] = useState(0)
const [showHistory, setShowHistory] = useState(false)
```

**`useState`** is the most fundamental hook. It declares a piece of state and returns:

1. The **current value** (e.g., `screen`)
2. A **setter function** to update it (e.g., `setScreen`)

When the setter is called, React re-renders the component with the new value.

#### How useState Works Internally

```typescript
const [value, setValue] = useState(initialValue)
```

- On the **first render**: `value` is `initialValue`
- When `setValue(newValue)` is called: React schedules a **re-render**
- On the **next render**: `value` is `newValue`

React preserves the state between renders using the component's position in the tree. This is why hooks must always be called in the same order.

### Managing State Transitions

The state transitions are handled by callbacks:

```typescript
// src/renderer/src/App.tsx:17-22
const handleStart = useCallback(() => {
  setScore(0)
  startTimeRef.current = Date.now()
  setScreen('playing')
}, [])

// src/renderer/src/App.tsx:24-31
const handleDeath = useCallback((finalScore: number) => {
  setScore(finalScore)
  const dur = Math.round((Date.now() - startTimeRef.current) / 1000)
  setDuration(dur)
  saveRecord({ score: finalScore, date: new Date().toLocaleString(), duration: dur })
  setScreen('gameover')
}, [])
```

These functions are **state transition handlers**:

- `handleStart`: `idle` or `gameover` → `playing` (reset score, record start time)
- `handleDeath`: `playing` → `gameover` (save final score, duration, history record)

---

## useEffect — Side Effects in React

**`useEffect`** lets you perform **side effects** in React components. Side effects are anything that affects something outside the component:

- Adding event listeners (`window.addEventListener`)
- Starting timers (`setInterval`)
- Fetching data
- Manipulating the DOM directly

### The Effect Signature

```typescript
useEffect(() => {
  // Side effect code

  return () => {
    // Cleanup code (runs when component unmounts or deps change)
  }
}, [dependencies])
```

### The Space Key Listener

```typescript
// src/renderer/src/App.tsx:42-55
useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault()
      if (screen === 'idle' || screen === 'gameover') {
        handleStart()
      }
    }
  }
  window.addEventListener('keydown', onKeyDown)
  return () => window.removeEventListener('keydown', onKeyDown)
}, [screen, handleStart])
```

Breaking this down:

1. **Effect body**: Adds a `keydown` event listener to the window
2. **Cleanup**: Removes the listener (prevents memory leaks)
3. **Dependencies `[screen, handleStart]`**: The effect re-runs whenever `screen` or `handleStart` changes

#### Why Dependencies Matter

If the dependency array were empty (`[]`), the effect would run once and capture the initial value of `screen` (which is `'idle'`). After the game ends, `screen` changes to `'gameover'`, but the listener still checks for `'idle'` — the space key would never restart the game.

By including `[screen]`, a **new listener** is created with the current `screen` value every time it changes.

### The Arrow Key Listener

The arrow key handling is in `GameCanvas.tsx` and only runs during `playing`:

```typescript
// src/renderer/src/components/GameCanvas.tsx:45-65
useEffect(() => {
  if (screen !== 'playing') return

  // ... start game loop ...

  const handleKeyDown = (e: KeyboardEvent) => {
    const dirMap: Record<string, Direction> = {
      ArrowUp: Direction.Up,
      ArrowDown: Direction.Down,
      ArrowLeft: Direction.Left,
      ArrowRight: Direction.Right
    }
    const dir = dirMap[e.key]
    if (dir) {
      e.preventDefault()
      loopRef.current?.handleDirection(dir)
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  return () => {
    loop.stop()
    loopRef.current = null
    window.removeEventListener('keydown', handleKeyDown)
  }
}, [screen])
```

Key patterns here:

- **Guard clause** (`if (screen !== 'playing') return`): If not playing, do nothing
- **Cleanup function**: When `screen` changes away from `'playing'`, the previous effect's cleanup runs — it stops the game loop and removes the listener
- **`e.preventDefault()`**: Prevents arrow keys from scrolling the page

---

## useCallback — Stable Function References

**`useCallback`** returns a **memoized** version of a function that only changes when its dependencies change.

```typescript
const handleStart = useCallback(() => {
  setScore(0)
  startTimeRef.current = Date.now()
  setScreen('playing')
}, [])
```

### Why Use useCallback?

Without `useCallback`, every render creates a **new function**:

```typescript
// Without useCallback — new function every render
const handleStart = () => {
  setScreen('playing')
}
```

This causes:

1. Child components that receive this function as a prop will **re-render** every time (because the reference changed)
2. Effects that depend on this function will **re-run** every time

With `useCallback` and an empty dependency array `[]`, the same function reference is preserved across renders, preventing unnecessary re-renders and effect re-runs.

### When to Use It

Use `useCallback` when:

- Passing the function to a child component (via props)
- Using the function as a dependency in `useEffect`
- The function is expensive to create

In this project, `handleStart` and `handleDeath` use `useCallback` because they are dependencies of the keyboard `useEffect`.

---

## useRef — Mutable Values Across Renders

**`useRef`** creates a mutable object that persists across re-renders without causing re-renders when changed.

```typescript
const startTimeRef = useRef(0)
const scoreRef = useRef(0)
```

### Ref vs State

| | `useState` | `useRef` |
|---|-----------|---------|
| Changes cause re-render? | Yes | No |
| Access pattern | `score` (direct) | `scoreRef.current` |
| Use case | UI state (visible values) | Internal tracking (timers, DOM refs) |

### Why useRef for startTime?

```typescript
const handleStart = useCallback(() => {
  startTimeRef.current = Date.now()
  setScreen('playing')
}, [])

const handleDeath = useCallback((finalScore: number) => {
  const dur = Math.round((Date.now() - startTimeRef.current) / 1000)
  // ...
}, [])
```

`startTimeRef` tracks when the game started. It's used to calculate the game duration when the snake dies. Since this value is **not displayed directly** (the final `duration` state is), there's no need to trigger a re-render when it changes.

### Canvas Ref

```typescript
const canvasRef = useRef<HTMLCanvasElement>(null)
```

`useRef` is also used to access **DOM elements** directly. `canvasRef` gives React a reference to the `<canvas>` element so the game loop can draw on it:

```typescript
const canvas = canvasRef.current
const ctx = canvas.getContext('2d')
```

### Score Ref in GameCanvas

```typescript
// src/renderer/src/components/GameCanvas.tsx:14
const scoreRef = useRef(0)
```

This tracks the score from inside the game loop callback. When the snake dies and `onDeath` is called, the callback needs the latest score. Using a ref ensures it always has the current value, even though the callback was created once in the effect.

---

## Rendering the State Machine

The `App.tsx` component renders different UI based on the current state:

```typescript
// src/renderer/src/App.tsx:57-96
return (
  <div>
    {/* Score bar — always visible */}
    <div>
      <span>Score: {score}</span>
      <button>{t('switchLang')}</button>
      <button onClick={() => setShowHistory(true)}>{t('history')}</button>
    </div>

    {/* Canvas container with overlays */}
    <div>
      <GameCanvas screen={screen} onDeath={handleDeath} onScoreChange={setScore} />

      {/* Idle overlay */}
      {screen === 'idle' && (
        <div>
          <h1>Snake</h1>
          <p>Press SPACE to start</p>
        </div>
      )}

      {/* Game over overlay */}
      {screen === 'gameover' && (
        <div>
          <h1>Game Over</h1>
          <p>Score: {score}</p>
          <p>Duration: {duration}s</p>
        </div>
      )}
    </div>

    {/* History modal */}
    {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
  </div>
)
```

Key pattern: **conditional rendering** with `{condition && <Component />}`. When `condition` is `false`, React renders nothing. When `true`, it renders the component.

---

## Component Communication

The component hierarchy passes data through **props**:

```
App.tsx
  ├── score, duration, screen  (useState)
  │
  ├── GameCanvas
  │     props: screen, onDeath, onScoreChange
  │     — starts/stops game loop based on screen
  │     — calls onDeath when snake dies
  │     — calls onScoreChange on every tick
  │
  ├── Idle Overlay (inline)
  │     — title, start message
  │
  ├── GameOver Overlay (inline)
  │     — final score, duration, restart message
  │
  └── HistoryModal
        props: onClose
        — manages its own state (records, confirm dialog)
        — calls onClose when dismissed
```

Data flows **down** via props, and events flow **up** via callbacks (like `onDeath`).

---

## Key Takeaways

1. **`useState`** declares state that triggers re-renders when changed
2. **`useEffect`** manages side effects (event listeners, timers) with proper cleanup
3. **`useCallback`** memoizes functions to prevent unnecessary re-renders
4. **`useRef`** holds mutable values across renders without causing re-renders
5. The **state machine pattern** (`idle` → `playing` → `gameover`) makes state transitions explicit and predictable
6. **Conditional rendering** (`{condition && <Component />}`) shows/hides UI based on state
7. **Props** flow data down, **callbacks** flow events up

---

## What's Next

Now you understand how React manages the UI state. The next tutorial **[05-canvas-rendering.md](05-canvas-rendering.md)** covers how the Canvas 2D API draws the game graphics — the grid, the snake, and the food pellets.
