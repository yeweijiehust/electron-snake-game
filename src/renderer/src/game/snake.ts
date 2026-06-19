import { Direction, Position, Snake, GRID_SIZE } from './types'

export function createSnake(): Snake {
  const mid = Math.floor(GRID_SIZE / 2)
  return {
    body: [
      { x: mid - 1, y: mid },
      { x: mid, y: mid },
      { x: mid + 1, y: mid }
    ],
    direction: Direction.Right,
    queue: [],
    alive: true
  }
}

const directionVectors: Record<Direction, Position> = {
  [Direction.Up]: { x: 0, y: -1 },
  [Direction.Down]: { x: 0, y: 1 },
  [Direction.Left]: { x: -1, y: 0 },
  [Direction.Right]: { x: 1, y: 0 }
}

const opposites: Record<Direction, Direction> = {
  [Direction.Up]: Direction.Down,
  [Direction.Down]: Direction.Up,
  [Direction.Left]: Direction.Right,
  [Direction.Right]: Direction.Left
}

export function changeDirection(snake: Snake, dir: Direction): void {
  const q = snake.queue
  const lastDir = q.length > 0 ? q[q.length - 1] : snake.direction
  if (dir === opposites[lastDir]) return
  if (q.length < 2) {
    q.push(dir)
  }
}

export function moveSnake(snake: Snake, food: Position): { ate: boolean } {
  if (!snake.alive) return { ate: false }

  if (snake.queue.length > 0) {
    snake.direction = snake.queue.shift()!
  }

  const head = snake.body[snake.body.length - 1]
  const vec = directionVectors[snake.direction]
  const newHead: Position = { x: head.x + vec.x, y: head.y + vec.y }

  if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
    snake.alive = false
    return { ate: false }
  }

  for (const seg of snake.body) {
    if (seg.x === newHead.x && seg.y === newHead.y) {
      snake.alive = false
      return { ate: false }
    }
  }

  snake.body.push(newHead)

  const ate = newHead.x === food.x && newHead.y === food.y
  if (!ate) {
    snake.body.shift()
  }

  return { ate }
}

export function checkCollision(head: Position, body: Position[]): boolean {
  for (let i = 0; i < body.length - 1; i++) {
    if (body[i].x === head.x && body[i].y === head.y) return true
  }
  return false
}
