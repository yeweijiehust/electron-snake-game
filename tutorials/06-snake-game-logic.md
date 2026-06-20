# 06 — Snake Game Logic: Movement, Collision, and Food

## Overview

This tutorial covers the **core game logic** — the pure TypeScript functions that make the snake move, detect collisions, and generate food. These functions are the "brain" of the game: they don't draw anything, don't handle input, and don't know about React or Canvas. They are **pure functions** that take data in and return data out.

By the end of this tutorial, you'll understand:

- How the snake is represented as a data structure
- How movement works by adding and removing array elements
- How the 2-input direction buffer prevents "reverse into yourself" deaths
- How wall and self-collision are detected
- How food is generated at valid positions

---

## Prerequisites

- **JavaScript/TypeScript arrays** — `push`, `shift`, indexing
- **Coordinate systems** — understanding `x, y` positions
- The **game types** from [03-typescript-basics.md](03-typescript-basics.md)
- Optionally, the Canvas rendering from [05-canvas-rendering.md](05-canvas-rendering.md)

---

## The Snake Data Structure

```typescript
// src/renderer/src/game/types.ts:14-20
export interface Snake {
  body: Position[]    // Array of segments, tail-first
  direction: Direction  // Current movement direction
  queue: Direction[]    // Buffered direction changes (max 2)
  alive: boolean        // Whether the snake is still alive
}
```

The snake's body is an **array of positions**. The **tail** is at index 0, and the **head** is at the last index.

```
body = [
  {x:9, y:10},   ← tail (index 0)
  {x:10, y:10},  ← body (index 1)
  {x:11, y:10}   ← head (index 2, last element)
]

direction = Direction.Right
```

### Why Tail-First?

The tail-first ordering makes movement efficient. When the snake moves forward:

1. A new head position is **appended** (`push`) to the end
2. The tail is **removed** (`shift`) from the front

This is O(1) per operation (amortized) and exactly matches how the snake moves in real life — the head goes forward, the tail follows.

---

## Creating the Snake

```typescript
// src/renderer/src/game/snake.ts:3-11
export function createSnake(): Snake {
  const mid = Math.floor(GRID_SIZE / 2)  // 10
  return {
    body: [
      { x: mid - 1, y: mid },   // (9, 10)  tail
      { x: mid, y: mid },        // (10, 10) body
      { x: mid + 1, y: mid }    // (11, 10) head
    ],
    direction: Direction.Right,
    queue: [],
    alive: true
  }
}
```

The snake starts at the **center** of the grid (row 10, columns 9-11), facing right, with a length of 3.

---

## Direction Vectors

```typescript
// src/renderer/src/game/snake.ts:13-18
const directionVectors: Record<Direction, Position> = {
  [Direction.Up]:    { x: 0, y: -1 },
  [Direction.Down]:  { x: 0, y: 1 },
  [Direction.Left]:  { x: -1, y: 0 },
  [Direction.Right]: { x: 1, y: 0 }
}
```

Each direction maps to a **movement vector** — the change in x and y when the snake moves one step in that direction:

| Direction | x change | y change |
|-----------|----------|----------|
| Up | 0 | -1 |
| Down | 0 | +1 |
| Left | -1 | 0 |
| Right | +1 | 0 |

The new head position is always: `head + directionVector`.

### Opposite Directions

```typescript
// src/renderer/src/game/snake.ts:20-25
const opposites: Record<Direction, Direction> = {
  [Direction.Up]:    Direction.Down,
  [Direction.Down]:  Direction.Up,
  [Direction.Left]:  Direction.Right,
  [Direction.Right]: Direction.Left
}
```

This map is used to prevent the snake from reversing into itself.

---

## Direction Change with Input Buffer

The snake uses a **2-input direction buffer** so that rapid key presses aren't lost.

```typescript
// src/renderer/src/game/snake.ts:27-33
export function changeDirection(snake: Snake, dir: Direction): void {
  const q = snake.queue
  const lastDir = q.length > 0 ? q[q.length - 1] : snake.direction
  if (dir === opposites[lastDir]) return
  if (q.length < 2) {
    q.push(dir)
  }
}
```

### Why a Buffer?

Without a buffer, if the player presses **Up** then **Left** before the next tick, only the last key press (Left) registers. The snake would go Left instead of Up-Left, making the controls feel unresponsive.

With a 2-input buffer, both presses are queued and consumed one-per-tick:

```
Tick 1: snake moves Right (current direction)
        Player presses  Up    → queue = [Up]
        Player presses  Left  → queue = [Up, Left]

Tick 2: queue → Up → snake moves Up, queue = [Left]
        Player presses Down   → rejected (opposite of Up)

Tick 3: queue → Left → snake moves Left
```

### Input Validation

The function rejects invalid inputs:

1. **Opposite to last queued direction**: Prevents the snake from reversing into itself
2. **Queue full (2 entries)**: Silently ignores extra inputs (no overflow)

#### The Opposite Check

```typescript
const lastDir = q.length > 0 ? q[q.length - 1] : snake.direction
if (dir === opposites[lastDir]) return
```

If the snake is moving Right and the queue is empty, `lastDir = Direction.Right`. Trying to go Left (opposite) is rejected. This prevents the snake from instantly reversing direction and running into its own body.

If the queue has `[Up]`, then `lastDir = Direction.Up`. Trying to go Down (opposite) is rejected.

---

## Movement

```typescript
// src/renderer/src/game/snake.ts:35-58
export function moveSnake(snake: Snake, food: Position): { ate: boolean } {
  if (!snake.alive) return { ate: false }

  // 1. Consume the next direction from the queue (if any)
  if (snake.queue.length > 0) {
    snake.direction = snake.queue.shift()!
  }

  // 2. Calculate the new head position
  const head = snake.body[snake.body.length - 1]
  const vec = directionVectors[snake.direction]
  const newHead: Position = { x: head.x + vec.x, y: head.y + vec.y }

  // 3. Check wall collision
  if (newHead.x < 0 || newHead.x >= GRID_SIZE ||
      newHead.y < 0 || newHead.y >= GRID_SIZE) {
    snake.alive = false
    return { ate: false }
  }

  // 4. Check self collision
  for (const seg of snake.body) {
    if (seg.x === newHead.x && seg.y === newHead.y) {
      snake.alive = false
      return { ate: false }
    }
  }

  // 5. Move: add new head
  snake.body.push(newHead)

  // 6. Remove tail (unless eating)
  const ate = newHead.x === food.x && newHead.y === food.y
  if (!ate) {
    snake.body.shift()
  }

  return { ate }
}
```

### Step by Step

#### Step 1: Consume Queue

```typescript
if (snake.queue.length > 0) {
  snake.direction = snake.queue.shift()!
}
```

`shift()` removes and returns the first element of the queue. The `!` (non-null assertion) tells TypeScript "I know this isn't undefined because I checked `length > 0`."

#### Step 2: Calculate New Head

```typescript
const head = snake.body[snake.body.length - 1]
const vec = directionVectors[snake.direction]
const newHead = { x: head.x + vec.x, y: head.y + vec.y }
```

If heading Right (vector `{x:1, y:0}`) from position `(11, 10)`, new head is `(12, 10)`.

#### Step 3: Wall Collision

```typescript
if (newHead.x < 0 || newHead.x >= GRID_SIZE ||
    newHead.y < 0 || newHead.y >= GRID_SIZE) {
  snake.alive = false
  return { ate: false }
}
```

The grid is 0 to 19 (GRID_SIZE = 20). If the new head is outside these bounds, the snake dies.

#### Step 4: Self Collision

```typescript
for (const seg of snake.body) {
  if (seg.x === newHead.x && seg.y === newHead.y) {
    snake.alive = false
    return { ate: false }
  }
}
```

Checks if the new head position matches any current body segment. This check happens **before** adding the new head and **before** removing the tail, so it catches collisions with the tail too.

#### Step 5-6: Move or Grow

```typescript
snake.body.push(newHead)        // Add new head

const ate = newHead.x === food.x && newHead.y === food.y
if (!ate) {
  snake.body.shift()            // Remove tail (normal move)
}
// If ate === true, tail stays → snake grows by 1
```

This is the key mechanic:

- **Normal move**: push new head, shift old tail → length stays the same
- **Eating**: push new head, DON'T shift tail → length increases by 1

---

## A Movement Example

```
Initial state:
  body = [(9,10), (10,10), (11,10)]  length=3
  direction = Right

After moveSnake (no food):
  newHead = (12, 10)
  body.push((12, 10))  → [(9,10), (10,10), (11,10), (12,10)]
  body.shift()         → [(10,10), (11,10), (12,10)]  length=3

  The snake moved right by 1 cell.

After moveSnake (food at (12,10)):
  newHead = (12, 10) ← matches food position
  body.push((12, 10))  → [(9,10), (10,10), (11,10), (12,10)]
  ate = true → no shift → [(9,10), (10,10), (11,10), (12,10)]  length=4

  The snake grew by 1 cell.
```

---

## Collision Detection

### Wall Collision

The wall collision check is simply bounds checking:

```typescript
newHead.x < 0 || newHead.x >= GRID_SIZE ||
newHead.y < 0 || newHead.y >= GRID_SIZE
```

### Self Collision

```typescript
// A helper function for checking self-collision
// src/renderer/src/game/snake.ts:60-65
export function checkCollision(head: Position, body: Position[]): boolean {
  for (let i = 0; i < body.length - 1; i++) {
    if (body[i].x === head.x && body[i].y === head.y) return true
  }
  return false
}
```

This is exported separately (and tested) as a utility function. It checks if `head` overlaps with any segment, **excluding the last one** (`body.length - 1`), because the last element is the head itself.

### Note on the Check

In `moveSnake`, the self-collision check iterates over **all** body segments (including the tail). This means:

- If the snake is 3 cells long and tries to move to where its tail currently is, **it dies** — even though the tail will be removed
- This is intentional: requiring the player to not "chase their tail" keeps the game fair

---

## Food Generation

```typescript
// src/renderer/src/game/food.ts:3-14
export function generateFood(snakeBody: Position[]): Position {
  const occupied = new Set(snakeBody.map((p) => `${p.x},${p.y}`))
  const available: Position[] = []

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      if (!occupied.has(`${x},${y}`)) {
        available.push({ x, y })
      }
    }
  }

  if (available.length === 0) {
    return { x: 0, y: 0 }  // Fallback (should never happen)
  }

  return available[Math.floor(Math.random() * available.length)]
}
```

### How It Works

1. **Build occupied set**: Convert the snake's body positions into a `Set` of strings (`"5,10"`, `"6,10"`, etc.). Using a Set makes lookups O(1) vs O(n) with an array.
2. **Scan all cells**: Iterate through every cell in the 20×20 grid (400 cells total)
3. **Collect available**: Add cells not occupied by the snake
4. **Pick randomly**: Return a random cell from the available list

### Why String Keys?

```typescript
const occupied = new Set(snakeBody.map((p) => `${p.x},${p.y}`))
```

JavaScript Sets use **strict equality** (`===`) for comparison. Two objects `{x:5, y:10}` are never `===` to each other. By converting to strings, `"5,10" === "5,10"` is always true, making the Set work correctly with objects.

### Edge Case: Grid Full

If the snake fills the entire grid (possible in theory with a 400-cell snake), `available` will be empty. The function returns `{x:0, y:0}` as a fallback. In practice, this never happens because the snake would starve first.

### Why Not Random with Retry?

A simpler approach might be:

```typescript
// Naive approach — might never find a spot
do {
  food = { x: random(0, 19), y: random(0, 19) }
} while (snakeOnCell(food))
```

This could theoretically loop forever if the snake is large. The scan-all approach is O(400) every time, which is deterministic and fast enough for a 150ms game loop.

---

## Pure Functions

All game logic functions are **pure functions** — they only depend on their inputs and don't modify anything outside their scope:

| Function | Input | Output/Effect |
|----------|-------|---------------|
| `createSnake()` | Nothing | Returns a new `Snake` |
| `changeDirection(snake, dir)` | Modifies `snake.queue` | Void |
| `moveSnake(snake, food)` | Modifies `snake.body`, `snake.alive` | `{ ate: boolean }` |
| `checkCollision(head, body)` | `Position`, `Position[]` | `boolean` |
| `generateFood(snakeBody)` | `Position[]` | `Position` |

Note: `moveSnake` and `changeDirection` **mutate** the snake object rather than returning a new one. This is an intentional design choice for performance (avoiding array copies every 150ms). In a functional programming sense they're not "pure," but they are **deterministic** — same input always produces same result.

---

## Key Takeaways

1. **Snake body** is an array of positions, tail-first, head-last
2. **Movement** = push new head + shift tail (unless eating)
3. **Direction buffer** stores up to 2 inputs, rejects opposites, consumed one-per-tick
4. **Wall collision** = new head outside grid bounds
5. **Self collision** = new head matches any existing body segment
6. **Food generation** = scan all cells, collect unoccupied, pick random
7. **Pure functions** with deterministic behavior make the game logic testable and predictable

---

## What's Next

Now you understand the game logic. The next tutorial **[07-game-loop.md](07-game-loop.md)** covers how the game loop orchestrates everything — calling the logic functions, redrawing the canvas, and communicating with React — all running on a 150ms timer.
