# 05 — Canvas Rendering the Game

## Overview

This tutorial covers how the Snake game uses the **Canvas 2D API** to draw all game graphics. You'll learn how the grid, snake, and food are rendered each frame, and how Canvas works as a drawing surface inside a React component.

By the end of this tutorial, you'll understand:

- What the Canvas API is and how to use it
- How the coordinate system maps to grid cells
- How each visual element (grid, snake body, food) is drawn
- How React integrates with Canvas via refs

---

## Prerequisites

- **Basic HTML/CSS** — know what a `<canvas>` element is
- **JavaScript coordinate systems** — understand `x, y` positions on a screen
- **React refs** — from tutorial [04-react-hooks-and-state.md](04-react-hooks-and-state.md)
- Knowledge of the **game types** from [03-typescript-basics.md](03-typescript-basics.md) (Position, Snake)

---

## What is the Canvas API?

The **Canvas 2D API** provides a way to draw graphics programmatically in the browser. You get a **bitmap drawing surface** — like an artist's canvas — and use JavaScript commands to draw shapes, lines, text, and images on it.

### Canvas vs DOM

| Approach | How it works | When to use |
|----------|-------------|-------------|
| **DOM** (React components) | Browser manages `<div>`, `<span>` elements | UI with buttons, text, forms |
| **Canvas** (2D context) | JavaScript draws pixels directly | Games, charts, image editing |

For a game like Snake, Canvas is the right choice because:

- **60fps rendering** — Canvas can redraw the entire scene quickly
- **Pixel-level control** — you draw exactly what you want
- **No DOM overhead** — no HTML elements to create/update per frame
- **Simple drawing API** — rectangles, arcs, text, images

### How Canvas Works

```html
<canvas id="game" width="500" height="500"></canvas>
<script>
  const canvas = document.getElementById('game')
  const ctx = canvas.getContext('2d')

  // Now draw with ctx:
  ctx.fillStyle = 'red'
  ctx.fillRect(10, 10, 50, 50)  // x, y, width, height
</script>
```

The `canvas.getContext('2d')` call returns a **rendering context** — an object with all the drawing methods. This is the only API you need for 2D games.

### Canvas Coordinate System

```
(0,0) ────────── x increases ────────► (500,0)
  │
  │    Each cell = 25×25 pixels
  │
  y    ┌────┬────┬────┬────┐
  │    │(0,0)│(1,0)│(2,0)│    │
  in   ├────┼────┼────┼────┤
  │    │(0,1)│    │    │    │
  cr   ├────┼────┼────┼────┤
  │    │    │    │    │    │
  e    ├────┼────┼────┼────┤
  │    │    │    │    │(19,19)
  a    └────────────────────┘
  s
  e
  s
  │
  ▼
(0,500)                           (500,500)
```

- **x** increases to the **right**
- **y** increases **downward** (opposite of math coordinates)
- The grid is 20×20 cells, each 25×25 pixels
- Canvas size: 500×500 pixels

---

## The Renderer Module (`src/renderer/src/game/renderer.ts`)

All Canvas drawing is in a single file. This keeps the drawing logic separate from the game logic (snake movement, collision detection).

```typescript
// src/renderer/src/game/renderer.ts:1
import { Snake, Position, CELL_SIZE, CANVAS_SIZE, GRID_SIZE } from './types'
```

### Drawing the Grid

```typescript
// src/renderer/src/game/renderer.ts:3-16
export function drawGrid(ctx: CanvasRenderingContext2D): void {
  // 1. Fill the background
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // 2. Draw grid lines
  ctx.strokeStyle = '#16213e'
  ctx.lineWidth = 0.5
  for (let x = 0; x <= GRID_SIZE; x++) {
    ctx.beginPath()
    ctx.moveTo(x * CELL_SIZE, 0)
    ctx.lineTo(x * CELL_SIZE, CANVAS_SIZE)
    ctx.stroke()
  }
  for (let y = 0; y <= GRID_SIZE; y++) {
    ctx.beginPath()
    ctx.moveTo(0, y * CELL_SIZE)
    ctx.lineTo(CANVAS_SIZE, y * CELL_SIZE)
    ctx.stroke()
  }
}
```

Step by step:

| Step | Method | What it does |
|------|--------|-------------|
| Background | `fillRect(0, 0, 500, 500)` | Fills the entire canvas with dark blue |
| Vertical lines | `moveTo/lineTo/stroke` for each column | Draws 21 vertical lines (0, 25, 50, ... 500) |
| Horizontal lines | Same for each row | Draws 21 horizontal lines |

The grid lines use `#16213e` (slightly lighter than the background) so they're subtle.

#### Why `moveTo` and `lineTo`?

Canvas drawing uses a **path model**:

```typescript
ctx.beginPath()       // Start a new path
ctx.moveTo(x1, y1)    // Move the "pen" to the starting point (no line drawn)
ctx.lineTo(x2, y2)    // Draw a line from current position to (x2, y2)
ctx.stroke()          // Make the line visible (outline the path)
```

You can think of it like drawing with a pen on paper: `moveTo` lifts the pen and moves it, `lineTo` puts the pen down and draws, `stroke` makes the ink visible.

### Drawing the Snake

```typescript
// src/renderer/src/game/renderer.ts:18-24
export function drawSnake(ctx: CanvasRenderingContext2D, snake: Snake): void {
  snake.body.forEach((seg, i) => {
    const isHead = i === snake.body.length - 1
    ctx.fillStyle = isHead ? '#4ecca3' : '#2d9b7a'
    ctx.fillRect(
      seg.x * CELL_SIZE + 1,
      seg.y * CELL_SIZE + 1,
      CELL_SIZE - 2,
      CELL_SIZE - 2
    )
  })
}
```

The snake body is an array of `Position` objects. Each segment is drawn as a filled rectangle:

- **Head** (last element in the array): brighter green `#4ecca3`
- **Body** (everything else): darker green `#2d9b7a`

#### Pixel Calculation

```
Grid position (2, 3) → Canvas pixel position:

  x = 2 * 25 = 50     (left edge of cell)
  y = 3 * 25 = 75     (top edge of cell)

  +1 offset → (51, 76) — 1px padding inside the cell
  -2 width  → 23×23   — 1px padding on each side
```

The `+1` offset and `-2` size create a **1-pixel gap** around each segment, giving the snake a cleaner appearance with visible space between segments and grid lines.

### Drawing the Food

```typescript
// src/renderer/src/game/renderer.ts:26-33
export function drawFood(ctx: CanvasRenderingContext2D, food: Position): void {
  ctx.fillStyle = '#e94560'
  ctx.beginPath()
  const cx = food.x * CELL_SIZE + CELL_SIZE / 2
  const cy = food.y * CELL_SIZE + CELL_SIZE / 2
  ctx.arc(cx, cy, CELL_SIZE / 2 - 2, 0, Math.PI * 2)
  ctx.fill()
}
```

The food is drawn as a **circle** (using `arc`):

| Parameter | Value | Meaning |
|-----------|-------|---------|
| `cx, cy` | Cell center | `x*25 + 12.5`, `y*25 + 12.5` |
| `radius` | `25/2 - 2 = 10.5` | Fills most of the cell with a 2px margin |
| `startAngle` | `0` | Start at 3 o'clock |
| `endAngle` | `Math.PI * 2` | Full circle (360 degrees) |

The `arc` method draws a circle arc:

```typescript
ctx.arc(x, y, radius, startAngle, endAngle)

// Angles are in radians:
//   0          = right (3 o'clock)
//   π/2        = bottom (6 o'clock)
//   π          = left (9 o'clock)
//   3π/2       = top (12 o'clock)
//   2π (π*2)   = full circle back to right
```

---

## The Draw Order

Each frame, the game loop calls three drawing functions in order:

```
1. drawGrid(ctx)     ← clears the canvas and draws grid
2. drawSnake(ctx, snake)  ← draws snake on top of grid
3. drawFood(ctx, food)    ← draws food on top of everything
```

This is the **painter's algorithm** — each new drawing covers whatever was drawn before. The order matters:

- Grid first (background)
- Snake second (on top of grid)
- Food last (on top of snake, so it's always visible even if the snake passes over it)

---

## Canvas in the Game Loop

The canvas drawing is called from the game loop tick:

```typescript
// src/renderer/src/game/gameLoop.ts:27-32
function tick(state: LoopState, ctx: CanvasRenderingContext2D): LoopState | null {
  const { snake, food, score } = state
  const { ate } = moveSnake(snake, food)

  // ... collision check ...

  drawGrid(ctx)        // Clear and redraw the grid
  drawSnake(ctx, snake) // Draw the snake in its new position
  drawFood(ctx, food)   // Draw the food

  return { snake, food: newFood, score: newScore }
}
```

Every 150 milliseconds, the game loop:

1. Moves the snake (game logic)
2. Checks for collisions (game logic)
3. Redraws everything (canvas rendering)
4. Updates the score display (React state)

---

## Canvas in React

The canvas element is rendered by React:

```typescript
// src/renderer/src/components/GameCanvas.tsx:68-72
return (
  <canvas
    ref={canvasRef}
    width={CANVAS_SIZE}
    height={CANVAS_SIZE}
    style={{ display: 'block', margin: '0 auto', border: '2px solid #4ecca3' }}
  />
)
```

React's role is limited to:

1. Creating the `<canvas>` element in the DOM
2. Providing a **ref** so the game loop can access the canvas
3. Applying CSS styles (border, centering)

All drawing and animation is handled outside React's render cycle, directly via the Canvas API.

### Initial Draw (Idle State)

When the game first loads (or when showing the idle screen), the canvas draws a **static** initial snake and food:

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

This effect runs once on mount. It creates a fresh snake and food position using `initLoopState()`, then draws them on the canvas. The game loop is not running yet — this is just a static preview.

---

## Color Palette

The game uses a dark theme with a consistent color palette:

| Element | Color | Hex |
|---------|-------|-----|
| Background | Dark navy | `#1a1a2e` |
| Grid lines | Darker navy | `#16213e` |
| Snake head | Bright green | `#4ecca3` |
| Snake body | Dark green | `#2d9b7a` |
| Food | Red-pink | `#e94560` |
| Border | Bright green (matching head) | `#4ecca3` |

---

## Key Takeaways

1. **Canvas 2D API** provides a bitmap drawing surface with methods like `fillRect`, `arc`, and path drawing
2. **Coordinate system**: x increases right, y increases down, each cell = 25×25 pixels
3. **`drawGrid()`** fills the background and draws subtle grid lines
4. **`drawSnake()`** draws each segment as a slightly padded rectangle, with the head a different color
5. **`drawFood()`** draws a filled circle centered in its cell
6. **Painter's algorithm**: grid → snake → food (each layer drawn on top of the previous)
7. **React's role**: render the `<canvas>` element, provide a ref, handle CSS. All drawing is manual Canvas API calls.
8. **Static preview**: the canvas shows an initial snake+food on mount, before the game loop starts.

---

## What's Next

Now you understand how the game looks. The next tutorial **[06-snake-game-logic.md](06-snake-game-logic.md)** covers the core game logic — how the snake moves, how collision detection works, and how food is generated.
