# 07 — The Game Loop: Ticking Everything Together

## Overview

This tutorial covers the **game loop** — the central timer that drives all game updates. Every 150 milliseconds, the loop calls the snake logic functions, updates the canvas, and reports the new score back to React. You'll learn how the loop is started, how it ticks, and how it integrates with the React component lifecycle.

By the end of this tutorial, you'll understand:

- How `setInterval` powers the game loop
- How the game loop orchestrates logic + rendering
- How the loop communicates game events back to React
- How the loop starts and stops cleanly

---

## Prerequisites

- **JavaScript timers** — `setInterval`, `clearInterval`
- **Snake game logic** from [06-snake-game-logic.md](06-snake-game-logic.md)
- **Canvas rendering** from [05-canvas-rendering.md](05-canvas-rendering.md)
- **React hooks** from [04-react-hooks-and-state.md](04-react-hooks-and-state.md)

---

## What is a Game Loop?

A **game loop** is the heart of any real-time game. It's a repeating cycle that:

1. **Processes input** — reads queued direction changes
2. **Updates state** — moves the snake, checks collisions, generates food
3. **Renders** — draws the updated state to the canvas
4. **Repeats** — waits a fixed interval, then does it again

```
                   ┌─────────────┐
                   │  Start      │
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │  Process    │
                   │  Input      │  ← consume direction queue
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │  Update     │
                   │  State      │  ← moveSnake, check collisions
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │  Render     │
                   │             │  ← drawGrid, drawSnake, drawFood
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │  Wait 150ms │  ← setInterval
                   └──────┬──────┘
                          │
                          └─────────→ repeat
```

---

## The Game Loop Module (`src/renderer/src/game/gameLoop.ts`)

### Loop State

```typescript
// src/renderer/src/game/gameLoop.ts:8-13
export interface LoopState {
  snake: Snake
  food: Position
  score: number
}
```

`LoopState` is the minimal state needed for the loop to run. It doesn't include the start time (React tracks that) or the screen state.

### Initializing the State

```typescript
// src/renderer/src/game/gameLoop.ts:15-20
export function initLoopState(): LoopState {
  const snake = createSnake()
  return {
    snake,
    food: generateFood(snake.body),
    score: 0
  }
}
```

This creates a fresh game state: a new snake at the center of the grid, a new food at a random valid position, and a score of 0.

### The Tick Function

```typescript
// src/renderer/src/game/gameLoop.ts:22-38
export function tick(state: LoopState, ctx: CanvasRenderingContext2D): LoopState | null {
  const { snake, food, score } = state

  const { ate } = moveSnake(snake, food)

  if (!snake.alive) {
    drawGrid(ctx)
    drawSnake(ctx, snake)
    return null       // Signal: game over
  }

  let newFood = food
  let newScore = score

  if (ate) {
    newScore = score + 1
    newFood = generateFood(snake.body)
  }

  drawGrid(ctx)
  drawSnake(ctx, snake)
  drawFood(ctx, newFood)

  return { snake, food: newFood, score: newScore }
}
```

Each tick:

| Step | Action | Returns |
|------|--------|---------|
| 1 | `moveSnake(snake, food)` | `{ ate: boolean }` |
| 2 | Check `snake.alive` | If dead: draw final frame, **return `null`** |
| 3 | If `ate`: increment score, generate new food | Updated state |
| 4 | Redraw grid, snake, food | New `LoopState` |

The return value tells the caller:

- `null` → game over
- `LoopState` → game continues with updated state

### Starting the Loop

```typescript
// src/renderer/src/game/gameLoop.ts:40-69
export function startLoop(
  ctx: CanvasRenderingContext2D,
  onStateChange: (state: LoopState | null) => void
): { stop: () => void; handleDirection: (dir: Direction) => void } {
  let state = initLoopState()
  let alive = true

  // Draw the initial frame immediately
  drawGrid(ctx)
  drawSnake(ctx, state.snake)
  drawFood(ctx, state.food)
  onStateChange(state)

  // Start the timer
  const intervalId = setInterval(() => {
    if (!alive) return

    const next = tick(state, ctx)
    if (next === null) {
      alive = false
      clearInterval(intervalId)
      onStateChange(null)
      return
    }
    state = next
    onStateChange(next)
  }, TICK_INTERVAL)

  // Return control interface
  return {
    stop: () => {
      alive = false
      clearInterval(intervalId)
    },
    handleDirection: (dir: Direction) => {
      if (!alive) return
      changeDirection(state.snake, dir)
    }
  }
}
```

#### What `startLoop` Does

1. **Creates initial state** via `initLoopState()`
2. **Draws the first frame** immediately (no delay)
3. **Calls `onStateChange(state)`** to notify React of the initial score
4. **Starts the interval** that calls `tick()` every 150ms
5. **Returns a control object** with `stop` and `handleDirection` methods

#### The `alive` Guard

```typescript
if (!alive) return
```

This prevents ticks from running after `stop()` is called. Even if `clearInterval` doesn't immediately cancel a pending callback (possible in some edge cases), the `alive` flag ensures no work is done.

#### The Return Object

```typescript
return {
  stop: () => { ... },           // Stop the loop
  handleDirection: (dir) => { ... }  // Queue a direction change
}
```

This is a **controller pattern** — instead of returning the `intervalId` for the caller to manage, the function returns an object with specific methods. The caller never touches `setInterval` directly.

---

## Integration with React (GameCanvas)

The `GameCanvas` component connects the game loop to React:

```typescript
// src/renderer/src/components/GameCanvas.tsx:30-65
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  if (screen !== 'playing') return

  scoreRef.current = 0
  const loop = startLoop(ctx, (state) => {
    if (state === null) {
      onDeath(scoreRef.current)    // Game over
    } else {
      scoreRef.current = state.score
      onScoreChange(state.score)   // Update score display
    }
  })
  loopRef.current = loop

  // Arrow key handler
  const handleKeyDown = (e: KeyboardEvent) => {
    const dirMap = {
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

### Lifecycle

```
Component mounts (screen = 'idle')
  │
  └─► Effect 1: Draw initial static snake + food (mount only)
  │
  └─► Effect 2: [screen] — screen is 'idle', guard clause returns
  │
User presses Space → screen = 'playing'
  │
  └─► Effect 2 cleanup: nothing to clean (wasn't running)
  │
  └─► Effect 2 re-runs: screen is 'playing'
       │
       ├─► startLoop() → creates new snake, starts interval
       ├─► addEventListener('keydown', handleKeyDown)
       │
       └─► Game ticks every 150ms...
            ├─► onScoreChange(score)    ← updates React state
            └─► loop.handleDirection()  ← from key presses
  │
Snake dies → onDeath(score) → screen = 'gameover'
  │
  └─► Effect 2 cleanup:
       ├─► loop.stop()  ← clears interval
       ├─► removeEventListener ← removes key handler
       │
  └─► Effect 2 re-runs: screen is 'gameover', guard clause returns
```

### The `scoreRef` Pattern

```typescript
scoreRef.current = 0           // Before startLoop
scoreRef.current = state.score  // Each tick
onDeath(scoreRef.current)       // On death, always has latest score
```

The `startLoop` callback is created once (inside the `useEffect`), but `scoreRef` is updated every tick. When the snake dies and `onDeath` is called, `scoreRef.current` always has the correct final score. This avoids stale closure problems.

---

## Initial Draw (Static Preview)

Before the game starts, the canvas shows a **static preview** of the initial snake and food:

```typescript
// src/renderer/src/components/GameCanvas.tsx:22-28
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const initial = initLoopState()
  drawGrid(ctx)
  drawSnake(ctx, initial.snake)
  drawFood(ctx, initial.food)
}, [])
```

This effect runs once on mount (empty dependency array) and draws the initial state. The game loop is not running — this is just to show the player what the game looks like before they press Space.

---

## Timing Considerations

### Why 150ms?

The choice of `TICK_INTERVAL = 150` (6.67 ticks per second) is a balance:

| Interval | Speed | Feel |
|----------|-------|------|
| 50ms | 20 ticks/s | Very fast, hard to control (Nibbler speed) |
| 100ms | 10 ticks/s | Fast, challenging (medium Snake) |
| **150ms** | **6.7 ticks/s** | **Moderate, comfortable (this game)** |
| 200ms | 5 ticks/s | Slow, easy (beginner mode) |

150ms is a classic arcade Snake speed — fast enough to be challenging, slow enough that you can react.

### setInterval vs requestAnimationFrame

`setInterval` is used instead of `requestAnimationFrame` because:

| Approach | Best for | Why not here |
|----------|----------|--------------|
| `requestAnimationFrame` | 60fps animations, smooth rendering | Game only updates at 6.7fps |
| `setInterval` | Fixed-rate updates | Exactly what we need — update every 150ms |

`requestAnimationFrame` is designed for smooth 60fps rendering. Our game updates at a fixed 150ms rate, so `setInterval` is the natural choice.

---

## Key Takeaways

1. **Game loop** = `setInterval` at 150ms that calls `tick()` repeatedly
2. **`tick()`** orchestrates: move snake → check collision → redraw canvas → return new state
3. **`startLoop()`** creates fresh state, draws initial frame, starts interval, returns controller
4. **`null` return** from tick signals game over to the caller
5. **Controller pattern** (`{ stop, handleDirection }`) abstracts timer management
6. **React integration**: useEffect starts/stops loop based on `screen` state
7. **Initial preview**: mount effect draws static snake before game starts
8. **`alive` flag** prevents ticks after `stop()` in edge cases

---

## What's Next

Now you understand the game loop. The next tutorial **[08-i18n-with-context.md](08-i18n-with-context.md)** covers how the game supports both Chinese and English using React Context.
